#
# Freesound is (c) MUSIC TECHNOLOGY GROUP, UNIVERSITAT POMPEU FABRA
#
# Freesound is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# Freesound is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Authors:
#     See AUTHORS file.
#

import os
from functools import partial, wraps
from itertools import count

import numpy as np
import pysndfile

from django.conf import settings
from django.contrib.auth.models import User
from django.test.utils import override_settings

from sounds.models import Sound, Pack, License
from tempfile import TemporaryDirectory
from utils.tags import clean_and_split_tags


def create_test_files(filenames=None, directory=None, paths=None, n_bytes=1024, make_valid_wav_files=False, duration=0.0):
    """
    This function generates test files with random content and saves them in the specified directory.
    :param filenames: list of names for the files to generate
    :param directory: folder where to store the files
    :param paths: if provided, then files are created in the indicated paths regardless of filenames and direcotry args
    :param n_bytes: numnber of bytes of each generated file
    :param make_valid_wav_files: whether to create a valid wav file with noise
    :param duration: duration of the wav file in seconds if make_valid_wav_files is True
    """
    if paths is None:
        paths = [os.path.join(directory, filename) for filename in filenames]
        
    for path in paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not make_valid_wav_files:
            f = open(path, 'wb')
            f.write(os.urandom(n_bytes))
            f.close()
        else:
            data = np.random.uniform(-1, 1, int(duration * 44100))
            scaled = np.int16(data / np.max(np.abs(data)) * 32767)
            pysndfile.sndio.write(path, scaled, format='wav', rate=44100)


sound_counter = count()  # Used in create_user_and_sounds to avoid repeating sound names


def create_user_and_sounds(num_sounds=1, num_packs=0, user=None, count_offset=0, tags=None,
                           processing_state='PE', moderation_state='PE', type='wav'):
    """Creates User, Sound and Pack objects useful for testing.

    A counter is used to make sound names unique as well as other fields like md5 (see `sound_counter` variable).
    NOTE: creating sounds requires License objects to exist in DB. Do that by making sure your test case loads
    'licenses' fixture, i.e. "fixtures = ['licenses']".

    Args:
        num_sounds (int): N sounds to generate.
        num_packs (int): N packs in which the sounds above will be grouped.
        user (User): user owner of the created sounds (if not provided, a new user will be created).
        count_offset (int): start counting sounds at X.
        tags (str or None): string of tags to be added to the sounds (all sounds will have the same tags).
        processing_state (str): processing state of the created sounds.
        moderation_state (str): moderation state of the created sounds.
        type (str): type of the sounds to be created (e.g. 'wav').

    Returns:
        (Tuple(User, List[Pack], List[Sound]): 3-element tuple containing the user owning the sounds,
            a list of the packs created and a list of the sounds created.
    """
    count_offset = count_offset + next(sound_counter)
    if user is None:
        user = User.objects.create_user("testuser", password="testpass", email='email@freesound.org')
    packs = list()
    for i in range(0, num_packs):
        pack = Pack.objects.create(user=user, name="Test pack %i" % (i + count_offset))
        packs.append(pack)
    sounds = list()
    for i in range(0, num_sounds):
        pack = None
        if packs:
            pack = packs[i % len(packs)]
        sound = Sound.objects.create(user=user,
                                     original_filename="Test sound %i" % (i + count_offset),
                                     base_filename_slug="test_sound_%i" % (i + count_offset),
                                     license=License.objects.all()[0],
                                     pack=pack,
                                     md5="fakemd5_%i" % (i + count_offset),
                                     type=type,
                                     processing_state=processing_state,
                                     moderation_state=moderation_state)

        if tags is not None:
            sound.set_tags(clean_and_split_tags(tags))
        sounds.append(sound)
    return user, packs, sounds


def test_using_bw_ui(test_case_object):
    session = test_case_object.client.session
    session[settings.FRONTEND_SESSION_PARAM_NAME] = settings.FRONTEND_BEASTWHOOSH
    session.save()


def override_path_with_temp_directory(fun, settings_path_name):
    """
    Decorator that wraps a function inside two context managers which i) create a temporary directory; and ii) override
    a settings path to that temporary directory. When the wrapped function exits, the created temporary will be
    deleted and the settings override reverted. This will happen even if the function exists with an Exception. This
    is useful in unit tests which write files to disk and we want to make sure these are deleted after the test has
    finished running.

    Code adapted from: https://stackoverflow.com/a/25827070
    """

    @wraps(fun)
    def ret_fun(*args, **kwargs):
        with TemporaryDirectory() as tmpfolder:
            with override_settings(**{settings_path_name: tmpfolder}):
                return fun(*args, **kwargs)
    return ret_fun


override_uploads_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='UPLOADS_PATH')

override_csv_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='CSV_PATH')

override_avatars_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='AVATARS_PATH')

override_analysis_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='ANALYSIS_PATH')

override_sounds_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='SOUNDS_PATH')

override_previews_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='PREVIEWS_PATH')

override_displays_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='DISPLAYS_PATH')

override_processing_tmp_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='PROCESSING_TEMP_DIR')

override_processing_before_description_path_with_temp_directory = \
    partial(override_path_with_temp_directory, settings_path_name='PROCESSING_BEFORE_DESCRIPTION_DIR')
