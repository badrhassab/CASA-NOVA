from getpass import getpass

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from api.models import Astronaut


class Command(BaseCommand):
    help = 'Set or change an astronaut password, storing only a Django password hash.'

    def handle(self, *args, **options):
        full_name = input('Nom complet de l’astronaute : ').strip()
        astronaut = Astronaut.objects.filter(full_name__iexact=full_name).first()
        if not astronaut:
            raise CommandError('Aucun astronaute ne correspond à ce nom complet.')

        password = getpass('Nouveau mot de passe (8 caractères minimum) : ')
        confirmation = getpass('Confirmez le mot de passe : ')
        if len(password) < 8:
            raise CommandError('Le mot de passe doit contenir au moins 8 caractères.')
        if password != confirmation:
            raise CommandError('Les mots de passe ne correspondent pas.')

        Astronaut.objects.filter(pk=astronaut.pk).update(password=make_password(password))
        self.stdout.write(self.style.SUCCESS(f'Mot de passe défini pour {astronaut.full_name}.'))
