# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2022-02-08 12:32
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sounds', '0040_auto_20220207_1627'),
    ]

    operations = [
        migrations.AddField(
            model_name='soundanalysis',
            name='analysis_time',
            field=models.FloatField(default=0),
        ),
    ]
