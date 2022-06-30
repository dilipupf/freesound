# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2019-10-10 14:37
from __future__ import unicode_literals

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0025_deleteduser_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='deleteduser',
            name='date_joined',
            field=models.DateTimeField(default=datetime.datetime(2019, 10, 10, 14, 37, 16, 698738)),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='deleteduser',
            name='deletion_date',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
