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

import json
import logging

from admin_reorder.middleware import ModelAdminReorder
from django.conf import settings
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.contrib import messages

from accounts.models import GdprAcceptance
from utils.onlineusers import cache_online_users

web_logger = logging.getLogger('web')


def dont_redirect(path):
    return 'bulklicensechange' not in path \
        and 'admin' not in path \
        and 'logout' not in path \
        and 'tosacceptance' not in path \
        and 'tos_api' not in path \
        and 'tos_web' not in path \
        and 'privacy' not in path \
        and 'cookies' not in path \
        and 'contact' not in path \
        and not path.startswith(settings.MEDIA_URL)


class OnlineUsersHandler:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        cache_online_users(request)
        response = self.get_response(request)
        return response


class BulkChangeLicenseHandler:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # check for authentication,
        # avoid infinite loop
        # allow user to logout (maybe a bit too much...)
        # don't run it for media URLs
        # N.B. probably better just to check for login in the URL
        if request.user.is_authenticated \
                and dont_redirect(request.get_full_path()):

            user = request.user
            if user.profile.has_old_license:
                return HttpResponseRedirect(reverse("bulk-license-change"))

        response = self.get_response(request)
        return response


class FrontendPreferenceHandler:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """
        This middleware sets a session variable when the parameter 'new_frontend' is received.
        The 'render' method will use this session variable to display the new/old frontend
        """
        if request.GET.get(settings.FRONTEND_CHOOSER_REQ_PARAM_NAME, None):
            selected_ui = request.GET.get(settings.FRONTEND_CHOOSER_REQ_PARAM_NAME)
            current_ui = request.session.get(settings.FRONTEND_SESSION_PARAM_NAME, None)
            if selected_ui != current_ui:
                web_logger.info('Frontend activation (%s)' % json.dumps({'name': selected_ui,
                                                                         'username': request.user.username}))
            request.session[settings.FRONTEND_SESSION_PARAM_NAME] = selected_ui
        response = self.get_response(request)
        return response


class TosAcceptanceHandler:
    """Checks if the user has accepted the updates to the Terms
    of Service in 2022. This replaces the agreement to the original ToS (2013, 2fd543f3a).
    When users agree with the new terms of service, they also agree on updating the
    CC licenses to 4.0.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        if request.user.is_authenticated \
                and dont_redirect(request.get_full_path()):
            try:
                request.user.gdpracceptance
            except GdprAcceptance.DoesNotExist:
                return HttpResponseRedirect(reverse("tos-acceptance"))

        response = self.get_response(request)
        return response


class UpdateEmailHandler:
    message = "We have identified that some emails that we have sent to you didn't go through, thus it appears that " \
              "your email address is not valid. Please update your email address to a working one to continue using " \
              "Freesound"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated \
                and 'tosacceptance' not in request.get_full_path() \
                and 'logout' not in request.get_full_path() \
                and 'tos_api' not in request.get_full_path() \
                and 'tos_web' not in request.get_full_path() \
                and 'contact' not in request.get_full_path() \
                and 'bulklicensechange' not in request.get_full_path() \
                and 'resetemail' not in request.get_full_path() \
                and not request.get_full_path().startswith(settings.MEDIA_URL):
                # replace with dont_redirect() and add resetemail to it after merge with gdpr_acceptance pr

            user = request.user

            if not user.profile.email_is_valid():
                messages.add_message(request, messages.INFO, self.message)
                return HttpResponseRedirect(reverse("accounts-email-reset"))

        response = self.get_response(request)
        return response


class ModelAdminReorderWithNav(ModelAdminReorder):
    # Customize ModelAdminReorder middleware so that it also reorders new django admin sidebar in 3.1+
    # from https://github.com/mishbahr/django-modeladmin-reorder/issues/47

    def process_template_response(self, request, response):

        if (
            getattr(response, 'context_data', None)
            and not response.context_data.get('app_list')
            and response.context_data.get('available_apps')
        ):
            available_apps = response.context_data.get('available_apps')
            response.context_data['app_list'] = available_apps
            response = super().process_template_response(request, response)
            response.context_data['available_apps'] = response.context_data[
                'app_list'
            ]
            return response

        return super().process_template_response(request, response)