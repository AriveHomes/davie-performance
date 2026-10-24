# DAVIE PERFORMANCE

Private-source black-and-electric-blue workout tracker.

## October 24 UI update — committed to GitHub

The frontend now has:

- **Last workout versus today**, aligned **set by set** with weight and reps in two columns.
- **Persistent completed sets**: a green check beside each confirmed set. Sets remain visible while you work on that exercise.
- **Today** tab and **View All Today's Sets** button: displays every exercise and set from the current day.
- **Edit** controls for weight and reps: updates a specific saved set by its stable backend ID, rather than creating a duplicate.
- **Safe-save protocol**: green confirmation only after an authenticated backend confirms the write AND a fresh read returns the expected record.
- Rest timer, session timer, progress tab, and workout-specific exercise filtering remain.

## Critical: app is not yet connected or deployed

The static GitHub frontend is NOT connected to the existing Google Sheet. This repository alone cannot deploy changes to the user's separately hosted Google Apps Script web app. The interface is committed, but you must connect an authenticated API and deploy before live saving or editing can work. Until then, the Save button **will display an error rather than pretend to save**. No Google Sheet rows were modified as part of this code update.

Your existing Google Sheet is unchanged:
https://docs.google.com/spreadsheets/d/10VxZTIHVvxbj8oenzPV4YtBMJl5vJfWK5xvJ2PgD2-0/edit

## Required backend contract

The page calls an authenticated *same-origin* endpoint POST `/api/workouts`, with JSON `{method,payload}`. Alternatively a trusted same-origin host can inject `window.DAVIE_API` with functions of the same names.

**getAppData({})** → `{today:"YYYY-MM-DD",library:[{name,group}],workouts:[{id,date,exercise,set,weight,reps,volume}],sessions:[{date,focus,sets,volume}],cardio:[]}`.

- Each workout row must have a **stable, unique `id`** that identifies the persisted row across reloads. Do not use array position or an index that can change when sorting.
- `today` must use the user's selected workout time zone (e.g. `America/Denver`).

**saveSet({exercise,focus,weight,reps,clientRequestId})** → `{saved:true,record:{id,date,exercise,set,weight,reps,volume}}`.

- The backend must authenticate the user, validate the values, assign the correct next set number and today's date, persist the row, and return the confirmed record.
- Use `clientRequestId` as an idempotency key to avoid duplicate sets during network retries.
- The frontend will reload the dataset and verify that the saved record exists before showing a green confirmation.

**updateSet({id,weight,reps,expected:{weight,reps}})** → `{saved:true,record:{id,date,exercise,set,weight,reps,volume}}`.

- Match by stable ID, reject stale edits when original values differ, recalculate volume and any estimated 1RM, and confirm the persisted row.
- The frontend reloads and verifies after the edit.

Responses from the POST endpoint: `{data:<result>}` or `{error:"message"}`. Calls must require authenticated sessions with appropriate CSRF protection; do **not** publish credentials, shared access tokens, or sheet data in public frontend JavaScript.

## Test checklist before switching from chat-based logging

1. Confirm last week's exercise history shows correct weights/reps on each set.
2. Save a test set, ensure a green check appears **only** after reloading successfully.
3. Ensure the exercise remains selected and all its previously logged sets stay visible.
4. Open Today; verify all saved exercises and sets are visible.
5. Edit the test set's reps and weight; confirm the exact same sheet row is updated, with no duplicate.
6. Disconnect internet and verify save is not falsely confirmed.
7. Verify permissions and backup/recovery strategy.

## Privacy and deploy

GitHub repository source visibility is private. Hosting a webpage and protecting data access are separate concerns; keep Google Sheet access restricted. GitHub alone does not automatically update the separate Apps Script deployment.


## GitHub-to-Google deployment is prepared (not activated)

A manual GitHub Actions workflow now builds the interface, embeds the app JavaScript in Apps Script's HTML, includes a signed-in `google.script.run` bridge, pushes the backend, and optionally publishes a web-app version.

Workflow: [DAVIE PERFORMANCE - Google Apps Script](../../actions/workflows/apps-script.yml)

**Do not target your original live Apps Script project for the first test.** `clasp push` overwrites the target Apps Script project's code. Create a **new dedicated standalone Apps Script project** first; the old project and the Google Sheet will remain untouched.

### One-time Google authorization and repository configuration

1. Open https://script.google.com/home/projects/create and create a standalone project called `DAVIE PERFORMANCE - TEST`. In its **Project Settings**, copy the **Script ID** (this is NOT the `/exec` deployment URL).
2. Open https://script.google.com/home/usersettings and enable the **Google Apps Script API**.
3. On a trusted computer with Node.js installed, run `npm install --global @google/clasp` followed by `clasp login`. Sign in to the Google account that owns/has access to the spreadsheet. Google stores its authentication file at `~/.clasprc.json` (on Windows typically `%USERPROFILE%\.clasprc.json`).
4. In this repository's **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `CLASP_SCRIPT_ID`: the test project's Script ID.
   - `CLASPRC_JSON`: the entire contents of the locally generated `.clasprc.json`. **Never paste these credentials into ChatGPT or commit them to GitHub**; add them directly to GitHub Secrets and protect your GitHub account with 2FA.
5. Open **Actions → DAVIE PERFORMANCE - Google Apps Script → Run workflow**. Keep `publish` unchecked on the first run. Confirm the code push succeeds.
6. Run again with `publish` checked to create a new private-access deployment. The workflow log should show the new deployment information. Open it while signed into your Google account, authorize Sheet access, and test reading old exercises. Test a new saved set only after confirming the right spreadsheet and app.
7. After validation, optionally set `CLASP_DEPLOYMENT_ID` to the **new** app deployment ID in GitHub Secrets. Subsequent publish runs then update its existing URL, rather than creating a new URL.

### After the first successful tests

We can switch the workflow from manual deployment to automatically deploying on GitHub pushes. Until then, publishing is intentionally manual to prevent accidentally replacing the existing production app.

The Google authorization token in `CLASPRC_JSON` is sensitive; granting it access to GitHub Actions requires your consent. If your Google Workspace administrator blocks the Apps Script API or CI-based OAuth, this method might need an administrator-approved alternative.
