/* eslint-disable no-param-reassign */
import throttle from 'lodash.throttle'
import playerSettings from './settings'
import { formatAudioDuration, playAtTime, isTouchEnabledDevice, getAudioElementDurationOrDurationProperty, stopAllPlayers, simultaneousPlaybackDisallowed } from './utils'
import { createIconElement } from '../../utils/icons'
import { createAudioElement, setProgressIndicator, onPlayerTimeUpdate } from './audio-element'
import { rulerFrequencyMapping } from './utils'

const updateProgressBarIndicator = (parentNode, audioElement, progressPercentage) => {
  const progressBar = parentNode.getElementsByClassName('bw-player__progress-bar')[0]
  if (progressBar !== undefined) { // progress bar is only there in big players
    const progressBarIndicatorGhost = progressBar.getElementsByClassName('bw-player__progress-bar-indicator--ghost')[0]
    const progressBarTime = progressBar.getElementsByClassName('bw-player__progress-bar-indicator--time')[0]
    const progressBarIndicator = progressBar.getElementsByClassName('bw-player__progress-bar-indicator')[0]
    const width = progressBarIndicator.parentElement.clientWidth - progressBarIndicator.clientWidth
    progressBarIndicatorGhost.style.transform = `translateX(${width * progressPercentage}px)`
    progressBarIndicatorGhost.style.opacity = 0.5
    progressBarTime.style.transform = `translateX(calc(${width * progressPercentage}px - 50%))`
    progressBarTime.style.opacity = 1
    const duration = getAudioElementDurationOrDurationProperty(audioElement, parentNode);
    progressBarTime.innerHTML = formatAudioDuration(duration * progressPercentage, true)
  }
}

export const hideProgressBarIndicator = (parentNode) => {
  const progressBar = parentNode.getElementsByClassName('bw-player__progress-bar')[0]
  if (progressBar !== undefined) { // progress bar is only there in big players
    const progressBarIndicatorGhost = progressBar.getElementsByClassName('bw-player__progress-bar-indicator--ghost')[0]
    const progressBarTime = progressBar.getElementsByClassName('bw-player__progress-bar-indicator--time')[0]
    progressBarIndicatorGhost.style.opacity = 0
    progressBarTime.style.opacity = 0
  }
}

/**
 *
 * @param {HTMLDivElement} parentNode
 * @param {HTMLAudioElement} audioElement
 * @param {'small' | 'big'} playerSize
 */
const createProgressIndicator = (parentNode, audioElement, playerImgNode, playerSize) => {
  const progressIndicatorContainer = document.createElement('div')
  progressIndicatorContainer.className =
    'bw-player__progress-indicator-container'
  const progressIndicator = document.createElement('div')
  progressIndicator.className = 'bw-player__progress-indicator'
  if (playerSize === 'big'){
    progressIndicator.classList.add('bw-player--big')
  }
  progressIndicatorContainer.appendChild(progressIndicator)
  progressIndicatorContainer.addEventListener(
    'mousemove',
    throttle(evt => {
      if (parentNode.dataset.rulerActive) {
        const imgHeight = playerImgNode.clientHeight;
        const showingSpectrogram = playerImgNode.src.indexOf(parentNode.dataset.waveform) === -1;
        let readout = "";
        const posY = Math.min(evt.offsetY, imgHeight);
        const height2 = imgHeight/2;
        if (showingSpectrogram) {
          const sampleRate = parseFloat(parentNode.dataset.samplerate, 10);
          const srScaleCorrection = sampleRate/44100.0
          readout = (srScaleCorrection * rulerFrequencyMapping[Math.floor((posY/imgHeight) * 500.0)]).toFixed(2) + "hz";
        } else {
          if (posY == height2)
              readout = "-inf";
          else
              readout = (20 * Math.log( Math.abs(posY/height2 - 1) ) / Math.LN10).toFixed(2);
          readout = readout + " dB";
        }
        const rulerIndicator = playerImgNode.parentNode.getElementsByClassName('bw-player__ruler-indicator')[0];
        rulerIndicator.innerText = readout;
      } else {
        // Update playhead
        const progressPercentage = evt.offsetX / progressIndicatorContainer.clientWidth
        setProgressIndicator(progressPercentage * 100, parentNode)

        // Update selected time indicator (only in big players)
        updateProgressBarIndicator(parentNode, audioElement, progressPercentage)
      }
    }),
    50
  )
  progressIndicatorContainer.addEventListener('mouseleave', () => {
    // Update playhead
    const duration = getAudioElementDurationOrDurationProperty(audioElement, parentNode);
    setProgressIndicator(
      ((100 * audioElement.currentTime) / duration) % 100,
      parentNode
    )
    // Update selected time indicator (only in big players)
    hideProgressBarIndicator(parentNode)
  })
  return progressIndicatorContainer
}

/**
 * @param {HTMLAudioElement} audioElement
 * @param {number} duration
 */
const createProgressBar = (audioElement, duration) => {
  const progressBar = document.createElement('div')
  progressBar.className = 'bw-player__progress-bar'
  const progressBarIndicator = document.createElement('div')
  progressBarIndicator.className = 'bw-player__progress-bar-indicator'
  const progressBarIndicatorGhost = document.createElement('div')
  progressBarIndicatorGhost.className =
    'bw-player__progress-bar-indicator--ghost'
  const progressBarTime = document.createElement('div')
  progressBarTime.className = 'bw-player__progress-bar-indicator--time'
  progressBar.appendChild(progressBarIndicator)
  progressBar.appendChild(progressBarIndicatorGhost)
  progressBar.appendChild(progressBarTime)
  progressBar.style.pointerEvents = "none";  // Do that so mouse events are propagated to the progress indicator layer
  return progressBar
}

/**
* @param {HTMLDivElement} parentNode
* @param {HTMLAudioElement} audioElement
 * @param {'small' | 'big'} playerSize
 * @param {bool} startWithSpectrum
 */
const createProgressStatus = (parentNode, audioElement, playerSize, startWithSpectrum) => {
  let { duration } = audioElement
  if ((duration === Infinity) || (isNaN(duration))){
    // Duration was not properly retrieved from audioElement. If given from data property, use that one.
    if (parentNode.dataset.duration !== undefined){
      duration = parseFloat(parentNode.dataset.duration)
    }
  }
  const progressStatusContainer = document.createElement('div')
  progressStatusContainer.className = 'bw-player__progress-container'
  const progressBar = createProgressBar(audioElement, duration)
  const progressStatus = document.createElement('div')
  progressStatus.className = 'bw-player__progress'
  const durationIndicator = document.createElement('span')
  durationIndicator.className = 'bw-total__sound_duration'
  const progressIndicator = document.createElement('span')
  progressIndicator.classList.add('hidden')
  if (playerSize === 'big') {
    progressStatusContainer.classList.add('bw-player__progress-container--big')
    progressStatus.classList.add('bw-player__progress--big')
    progressIndicator.classList.remove('hidden')
  } else {
    if (startWithSpectrum){
      progressStatusContainer.classList.add('bw-player__progress-container--inverted')
    }
  }
  durationIndicator.innerHTML = `${playerSettings.showRemainingTime ? '-' : ''}${formatAudioDuration(duration, parentNode.dataset.showMilliseconds)}`
  progressIndicator.innerHTML = formatAudioDuration(0, parentNode.dataset.showMilliseconds)
  progressStatus.appendChild(durationIndicator)
  progressStatus.appendChild(progressIndicator)
  if (playerSize === 'big') {
    progressStatusContainer.appendChild(progressBar)
  }
  progressStatusContainer.appendChild(progressStatus)
  return progressStatusContainer
}

/**
 *
 * @param {'play' | 'stop' | 'loop'} action
 */
const createControlButton = action => {
  const controlButton = document.createElement('button')
  controlButton.type = 'button'
  controlButton.className = 'no-border-bottom-on-hover bw-player-control-btn'
  controlButton.appendChild(createIconElement(`bw-icon-${action}`))
  return controlButton
}

/**
 * @param {HTMLAudioElement} audioElement
 * @param {'small' | 'big'} playerSize
 */
const createPlayButton = (audioElement, playerSize) => {
  const playButton = createControlButton(
    playerSize === 'big' ? 'play-stroke' : 'play'
  )
  playButton.setAttribute('title', 'Play/Pause')
  playButton.classList.add('bw-player__play-btn')
  playButton.addEventListener('click', (evt) => {
    const isPlaying = !audioElement.paused
    if (isPlaying) {
      audioElement.pause()
    } else {
      if (simultaneousPlaybackDisallowed() || evt.altKey){
        stopAllPlayers();
      }
      audioElement.play()
    }
    evt.stopPropagation()
  })
  return playButton
}

/**
 * @param {HTMLAudioElement} audioElement
 * @param {HTMLDivElement} parentNode
 */
const createStopButton = (audioElement, parentNode) => {
  const stopButton = createControlButton('stop')
  stopButton.setAttribute('title', 'Stop')
  stopButton.addEventListener('click', (e) => {
    audioElement.pause()
    audioElement.currentTime = 0
    setProgressIndicator(0, parentNode)
    onPlayerTimeUpdate(audioElement, parentNode)
    e.stopPropagation()
  })
  return stopButton
}

/**
 * @param {HTMLAudioElement} audioElement
 */
const createLoopButton = audioElement => {
  const loopButton = createControlButton('loop')
  loopButton.setAttribute('title', 'Loop')
  loopButton.classList.add('text-20')
  loopButton.addEventListener('click', (e) => {
    const willLoop = !audioElement.loop
    if (willLoop) {
      loopButton.classList.add('text-red-important')
    } else {
      loopButton.classList.remove('text-red-important')
    }
    audioElement.loop = willLoop
    e.stopPropagation()
  })
  return loopButton
}

const toggleSpectrogramWaveform = (playerImgNode, waveform, spectrum, playerSize) => {
  const controlsElement = playerImgNode.parentElement.querySelector('.bw-player__controls');
  const progressStatusContainerElement = playerImgNode.parentElement.querySelector('.bw-player__progress-container');
  const topControlsElement = playerImgNode.parentElement.querySelector('.bw-player__top_controls');
  const bookmarkElement = playerImgNode.parentElement.querySelector('.bw-player__favorite');
  const similarSoundsElement = playerImgNode.parentElement.querySelector('.bw-player__similar');
  let spectrogramButton = undefined;
  try {
    spectrogramButton = controlsElement.querySelector('i.bw-icon-spectogram').parentElement;
  } catch (error){}
  const hasWaveform = playerImgNode.src.indexOf(waveform) > -1
  if (hasWaveform) {
    playerImgNode.src = spectrum
    if (spectrogramButton !== undefined){
      spectrogramButton.classList.add('text-red-important')
    }
    controlsElement.classList.add('bw-player__controls-inverted');
    topControlsElement.classList.add('bw-player__controls-inverted');
    if (bookmarkElement !== null){
      bookmarkElement.classList.add('bw-player__controls-inverted');
    }
    if (similarSoundsElement !== null){
      similarSoundsElement.classList.add('bw-player__controls-inverted');
    }
    if (progressStatusContainerElement !== null){
      progressStatusContainerElement.classList.add('bw-player__progress-container--inverted');
    }
  } else {
    playerImgNode.src = waveform
    if (spectrogramButton !== undefined){
      spectrogramButton.classList.remove('text-red-important')
    }
    controlsElement.classList.remove('bw-player__controls-inverted');
    topControlsElement.classList.remove('bw-player__controls-inverted');
    if (bookmarkElement !== null){
      bookmarkElement.classList.remove('bw-player__controls-inverted');
    }
    if (similarSoundsElement !== null){
      similarSoundsElement.classList.remove('bw-player__controls-inverted');
    }
    if (progressStatusContainerElement !== null){
      progressStatusContainerElement.classList.remove('bw-player__progress-container--inverted');
    }
  }
}

/**
 *
 * @param {HTMLImgElement} playerImgNode
 * @param {HTMLDivElement} parentNode
 * @param {'small' | 'big'} playerSize
 * @param {bool} startWithSpectrum
 */
const createSpectogramButton = (playerImgNode, parentNode, playerSize, startWithSpectrum) => {
  const spectogramButton = createControlButton('spectogram')
  spectogramButton.setAttribute('title', 'Spectrogram/Waveform')
  const { spectrum, waveform } = parentNode.dataset
  if (startWithSpectrum){
    spectogramButton.classList.add('text-red-important');
  }
  spectogramButton.addEventListener('click', () => {
    toggleSpectrogramWaveform(playerImgNode, waveform, spectrum, playerSize)
  })
  return spectogramButton
}

const createRulerButton = (parentNode) => {
  const rulerButton = createControlButton('ruler')
  rulerButton.setAttribute('title', 'Ruler')
  rulerButton.classList.add('text-20')
  rulerButton.addEventListener('click', () => {
    if (parentNode.dataset.rulerActive !== undefined){
      delete parentNode.dataset.rulerActive;
    } else {
      parentNode.dataset.rulerActive = true;
    }
    const rulerIndicator = parentNode.getElementsByClassName('bw-player__ruler-indicator')[0];
    if (parentNode.dataset.rulerActive){
      rulerButton.classList.add('text-red-important');
      rulerIndicator.classList.add('opacity-090');
    } else {
      rulerButton.classList.remove('text-red-important');
      rulerIndicator.classList.remove('opacity-090');
    }
  })

  return rulerButton
}

const createRulerIndicator = (playerImage) => {
  const rulerIndicator = document.createElement('div')
  rulerIndicator.className = 'bw-player__ruler-indicator h-spacing-2'
  rulerIndicator.innerText = '-12.45 dB'
  rulerIndicator.style.pointerEvents = "none";  // Do that so mouse events are propagated to the progress indicator layer
  return rulerIndicator
}

/**
 *
 * @param {HTMLDivElement} parentNode
 * @param {HTMLAudioElement} audioElement
 * @param {'small' | 'big'} playerSize
 */
const createPlayerImage = (parentNode, audioElement, playerSize) => {
  const imageContainer = document.createElement('div')
  imageContainer.className = 'bw-player__img-container'
  if (playerSize === 'big') {
    imageContainer.classList.add('bw-player__img-container--big')
  } else if (playerSize === 'minimal') {
    imageContainer.classList.add('bw-player__img-container--minimal')
  }
  if (playerSize !== 'minimal') {
    const startWithSpectrum = document.cookie.indexOf('preferSpectrogram=yes') > -1;
    const {waveform, spectrum, title} = parentNode.dataset
    const playerImage = document.createElement('img')
    playerImage.className = 'bw-player__img'
    if (startWithSpectrum) {
      playerImage.src = spectrum
    } else {
      playerImage.src = waveform
    }
    playerImage.alt = title
    const progressIndicator = createProgressIndicator(parentNode, audioElement, playerImage, playerSize)
    imageContainer.appendChild(playerImage)
    imageContainer.appendChild(progressIndicator)
    const progressStatus = createProgressStatus(parentNode, audioElement, playerSize, startWithSpectrum)
    imageContainer.appendChild(progressStatus)
    imageContainer.addEventListener('click', evt => {
      if (evt.altKey){
        toggleSpectrogramWaveform(playerImage, waveform, spectrum, playerSize);
      } else {
        const clickPosition = evt.offsetX
        const width = evt.target.clientWidth
        let positionRatio = clickPosition / width
        if (playerSize === "small"){
          if (isTouchEnabledDevice() && positionRatio < 0.15) {
            // In small player and touch device, quantize touches near the start of the sound to position-0
            positionRatio = 0.0
          } else if (positionRatio < 0.05){
            // In small player but non-touch device, the quantization is less strict
            positionRatio = 0.0
          }
        }
        const duration = getAudioElementDurationOrDurationProperty(audioElement, parentNode);
        const time = duration * positionRatio
        if (audioElement.paused) {
          // If paused, use playAtTime util function because it supports setting currentTime event if data is not yet loaded
          playAtTime(audioElement, time)
        } else {
          // If already playing, just change current time and continue playing
          audioElement.currentTime = time
        }
        if (isTouchEnabledDevice()){
          // In touch enabled devices hide the progress indicator here because otherwise it will remain visible as no
          // mouseleave event is ever fired
          hideProgressBarIndicator(parentNode)
        }
        evt.stopPropagation()
      }      
    })
  }
  return imageContainer
}

/**
 *
 * @param {HTMLDivElement} parentNode
 * @param {HTMLImgElement} playerImgNode
 * @param {HTMLAudioElement} audioElement
 * @param {'small' | 'big'} playerSize
 */
const createPlayerControls = (parentNode, playerImgNode, audioElement, playerSize) => {
  const playerControls = document.createElement('div')
  playerControls.className = 'bw-player__controls stop-propagation'
  if (playerSize === 'big') {
    playerControls.classList.add('bw-player__controls--big')
  } else if (playerSize === 'minimal') {
    playerControls.classList.add('bw-player__controls--minimal')
  }

  if (isTouchEnabledDevice()){
    // For touch-devices (phones, tablets), we keep player controls always visible because hover tips are not that visible
    playerControls.classList.add('opacity-050')
  }

  let startWithSpectrum = false;
  if (playerImgNode !== undefined){  // Some players don't have playerImgNode (minimal)
    startWithSpectrum = playerImgNode.src.indexOf(parentNode.dataset.waveform) === -1;
  }
  if (startWithSpectrum){
    playerControls.classList.add('bw-player__controls-inverted');
  }

  const controls =
    playerSize === 'big'
      ? [createLoopButton(audioElement),
         createStopButton(audioElement, parentNode),
         createPlayButton(audioElement, playerSize),
         createSpectogramButton(playerImgNode, parentNode, playerSize, startWithSpectrum),
         createRulerButton(parentNode)]
      : [createPlayButton(audioElement, playerSize),
         createLoopButton(audioElement)]
  controls.forEach(el => playerControls.appendChild(el))
  return playerControls
}

const createPlayerTopControls = (parentNode, playerImgNode, playerSize, showSimilarSoundsButton, showBookmarkButton) => {
  const topControls = document.createElement('div')
  topControls.className = 'bw-player__top_controls right'
  if (showSimilarSoundsButton){
    const similarSoundsButton = createSimilarSoundsButton(parentNode, playerImgNode)
    topControls.appendChild(similarSoundsButton)
  }
  if (showBookmarkButton){
    const bookmarkButton = createSetFavoriteButton(parentNode, playerImgNode)
    topControls.appendChild(bookmarkButton)
  }
  if (playerSize == 'big'){
    const rulerIndicator = createRulerIndicator(playerImgNode);
    topControls.appendChild(rulerIndicator)
  }

  let startWithSpectrum = false;
  if (playerImgNode !== undefined){  // Some players don't have playerImgNode (minimal)
    startWithSpectrum = playerImgNode.src.indexOf(parentNode.dataset.waveform) === -1;
  }
  if (startWithSpectrum){
    topControls.classList.add('bw-player__controls-inverted');
  }

  return topControls;
}

/**
 *
 * @param {HTMLDivElement} parentNode
 * @param {HTMLImgElement} playerImgNode
 */
const createSetFavoriteButton = (parentNode, playerImgNode) => {
  const getIsFavorite = () => false // parentNode.dataset.favorite === 'true' // We always show the same button even if sound already bookmarked
  const favoriteButtonContainer = document.createElement('div')
  const favoriteButton = createControlButton('bookmark')
  const unfavoriteButton = createControlButton('bookmark-filled')
  favoriteButton.setAttribute('title', 'Bookmark this sound')
  unfavoriteButton.setAttribute('title', 'Remove bookmark')
  favoriteButtonContainer.classList.add(
    'bw-player__favorite',
    'stop-propagation'
  )
  
  if (isTouchEnabledDevice()){
    // For touch-devices (phones, tablets), we keep player controls always visible because hover tips are not that visible
    // Edit: the bookmark button all alone makes players look ugly, so we don't make them always visible even in touch devices
    //favoriteButtonContainer.classList.add('opacity-050')
  }
  favoriteButtonContainer.setAttribute('data-toggle', 'bookmark-modal');
  favoriteButtonContainer.setAttribute('data-modal-url', parentNode.dataset.bookmarkModalUrl);
  favoriteButtonContainer.setAttribute('data-add-bookmark-url', parentNode.dataset.addBookmarkUrl);
  favoriteButtonContainer.appendChild(
    getIsFavorite() ? unfavoriteButton : favoriteButton
  )
  favoriteButtonContainer.addEventListener('click', (e) => {
    const isCurrentlyFavorite = getIsFavorite()
    favoriteButtonContainer.innerHTML = ''
    favoriteButtonContainer.appendChild(
      isCurrentlyFavorite ? unfavoriteButton : favoriteButton
    )
    parentNode.dataset.favorite = `${!isCurrentlyFavorite}`
    e.stopPropagation()
  })
  return favoriteButtonContainer
}

/**
 *
 * @param {HTMLDivElement} parentNode
 * @param {HTMLImgElement} playerImgNode
 */
const createSimilarSoundsButton = (parentNode, playerImgNode) => {
  const similarSoundsButtonContainer = document.createElement('div')
  const similarSoundsButton = createControlButton('similar')
  similarSoundsButton.setAttribute('title', 'Find similar sounds')
  similarSoundsButtonContainer.classList.add(
    'bw-player__similar',
    'stop-propagation'
  )
  
  if (isTouchEnabledDevice()){
    // For touch-devices (phones, tablets), we keep player controls always visible because hover tips are not that visible
    // Edit: the bookmark button all alone makes players look ugly, so we don't make them always visible even in touch devices
    //similarSoundsButtonContainer.classList.add('opacity-050')
  }
  similarSoundsButton.setAttribute('data-toggle', 'similar-sounds-modal');
  similarSoundsButton.setAttribute('data-modal-content-url', parentNode.dataset.similarSoundsModalUrl);
  similarSoundsButtonContainer.appendChild(similarSoundsButton)
  return similarSoundsButtonContainer
}


/**
 * @param {HTMLDivElement} parentNode
 */
const createPlayer = parentNode => {
  const playerSize = parentNode.dataset.size
  const showBookmarkButton = parentNode.dataset.bookmark === 'true'
  const showSimilarSoundsButton = parentNode.dataset.similarSounds === 'true'
  const audioElement = createAudioElement(parentNode)
  const playerImage = createPlayerImage(
    parentNode,
    audioElement,
    playerSize
  )
  const playerImgNode = playerImage.getElementsByTagName('img')[0]
  parentNode.appendChild(playerImage)
  parentNode.appendChild(audioElement)
  const controls = createPlayerControls(parentNode, playerImgNode, audioElement, playerSize)
  playerImage.appendChild(controls)
  const topControls = createPlayerTopControls(parentNode, playerImgNode, playerSize, showSimilarSoundsButton, showBookmarkButton)
  playerImage.appendChild(topControls)
}

export {createPlayer};
