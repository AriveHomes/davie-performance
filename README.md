# DAVIE PERFORMANCE

Personal workout tracker with a premium black-and-electric-blue interface.

## Current status

The frontend is committed to GitHub. It is **not connected to Google Sheets** yet. The Save buttons intentionally refuse to write until a secure backend is connected; no workout history will appear in the GitHub version until that step is completed.

The existing Google Apps Script app and Google Sheet are still your current working tracker. Nothing in this repository automatically updates the deployed Apps Script web app.

## Features in this frontend

- Workout-focused exercise dropdowns: Chest/Biceps/Triceps, Back/Shoulders, Legs, Core/Cardio, Cardio.
- Previous session weights and reps, plus target reps, once the data API is connected.
- Black/blue interface with workout history, progress, and cardio tabs.
- Layout optimized for mobile screens.

## Data

Existing Google Sheet: https://docs.google.com/spreadsheets/d/10VxZTIHVvxbj8oenzPV4YtBMJl5vJfWK5xvJ2PgD2-0/edit

## Remaining work

1. Add an authenticated backend bridge to the existing Google Sheet.
2. Test read-only history and correct exercise-filter matching.
3. Verify a single test set saves and appears in WORKOUT LOG without duplicates.
4. Enable mobile deployment and test sign-in on iPhone.

**Do not paste your Google password, OAuth tokens, or Apps Script deployment credentials into this repository.**

## Privacy

This repository was reported as PUBLIC when first connected. Switch it to Private in GitHub's Settings > General > Danger Zone if you want your source code private. The spreadsheet itself has not been copied here.
