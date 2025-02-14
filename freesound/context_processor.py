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

import datetime

from django.conf import settings

from accounts.forms import BwFsAuthenticationForm, BwRegistrationForm, BwProblemsLoggingInForm
from messages.models import Message
from tickets.views import new_sound_tickets_count
from utils.frontend_handling import using_beastwhoosh


def context_extra(request):
    # Get number of new messages, number of uploaded sounds pending moderation and number of sounds to moderate
    # variables so we can use them directly in base.html without a templatetag
    tvars = {
        'media_url': settings.MEDIA_URL,
        'request': request,
    }
    
    # Determine if extra context needs to be computed (this will allways be true expect for most of api calls and embeds)
    # There'll be other places in which the extra context is not needed, but this will serve as an approximation
    should_compute_extra_context = True    
    if request.path.startswith('/apiv2/') and \
        'apply' not in request.path and \
        'login' not in request.path and \
        'logout' not in request.path:
        should_compute_extra_context = False
    if request.path.startswith('/embed/'):
        should_compute_extra_context = False

    if should_compute_extra_context:
        new_tickets_count = -1  # Initially set to -1 (to distinguish later users that can not moderate)
        num_pending_sounds = 0
        num_messages = 0

        if request.user.is_authenticated:
            if request.user.has_perm('tickets.can_moderate'):
                new_tickets_count = new_sound_tickets_count()
            if using_beastwhoosh(request):
                num_pending_sounds = request.user.profile.num_sounds_pending_moderation()
            num_messages = Message.objects.filter(user_to=request.user, is_archived=False, is_sent=False, is_read=False).count()

        # Determine if anniversary special css and js content should be loaded
        # Animations will only be shown during the day of the anniversary
        # Special logo will be shown during 2 weeks after the anniversary
        load_anniversary_content = \
            datetime.datetime(2020, 4, 5, 0, 0) <= datetime.datetime.today() <= datetime.datetime(2020, 4, 20) or \
            request.GET.get('anniversary', '0') == '1'

        tvars.update({
            'last_restart_date': settings.LAST_RESTART_DATE,
            'new_tickets_count': new_tickets_count,
            'num_pending_sounds': num_pending_sounds,
            'num_messages': num_messages,
            'load_anniversary_content': load_anniversary_content,
            'next_path': request.GET.get('next', request.get_full_path()),
            'login_form': BwFsAuthenticationForm(),  # Used for beast whoosh login modal only
            'problems_logging_in_form': BwProblemsLoggingInForm(),  # Used for beast whoosh login modal only
            'system_prefers_dark_theme': request.COOKIES.get('systemPrefersDarkTheme', False)  # Determine the user's system preference for dark/light theme
        })
    
    return tvars
