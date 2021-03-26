import {makeSoundsMap} from '../components/mapsMapbox';
import {handleGenericModal, handleModal} from "../components/modal";

// Latest sounds/Latest tags taps

const taps = [...document.querySelectorAll('[data-toggle="tap"]')];
const tapsElements = document.getElementsByClassName('bw-profile__tap_container');

const cleanActiveClass = () => {
  taps.forEach(tap => tap.classList.remove('active'));
  tapsElements.forEach(tapElement =>
    tapElement.classList.remove('bw-profile__tap_container__active')
  );
};

const handleTap = tap => {
  cleanActiveClass();

  const tapContainer = document.getElementById(tap.dataset.target.substring(1));

  tap.classList.add('active');
  tapContainer.classList.add('bw-profile__tap_container__active');
};

taps.forEach(tap => {
  tap.addEventListener('click', () => handleTap(tap));
});

// Follow modals
const userFollowersButton = document.getElementById('user-followers-button');
const userFollowUsersButton = document.getElementById('user-following-users-button');
const userFollowTagsButton = document.getElementById('user-following-tags-button');
[userFollowersButton, userFollowUsersButton, userFollowTagsButton].forEach(button => {
  button.addEventListener('click', () => {
    handleGenericModal(button.dataset.modalContentUrl);
  });
});

const urlParams = new URLSearchParams(window.location.search);
const followersModalParam = urlParams.get('followers');
const followingModalParam = urlParams.get('following');
const followingTagsModalParam = urlParams.get('followingTags');

if (followersModalParam) {
  handleGenericModal(userFollowersButton.dataset.modalContentUrl);
}

if (followingModalParam) {
  handleGenericModal(userFollowUsersButton.dataset.modalContentUrl);
}

if (followingTagsModalParam) {
  handleGenericModal(userFollowTagsButton.dataset.modalContentUrl);
}


// User geotags map
const mapCanvas = document.getElementById('map_canvas');
const latestGeotagsSection = document.getElementById('latest_geotags');
makeSoundsMap(mapCanvas.dataset.geotagsUrl, 'map_canvas', () => {
  latestGeotagsSection.style.display = 'block'; // Once map is ready, show geotags section
});