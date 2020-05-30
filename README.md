## Quick firebase setup

First of all, make sure you've built your project using the production configuration.

```console
ng build --prod
```

That way, `src/environments/environment.ts` is overwritten by `src/environments/environment.prod.ts` and the `SERVER_URL`, and other entries, will be correct for out deployment in production.

Then run the firebase command,

```console
firebase deploy
```

### References

https://medium.com/dailyjs/real-time-apps-with-typescript-integrating-web-sockets-node-angular-e2b57cbd1ec1

https://socket.io/get-started/chat/#Introduction

https://firebase.google.com/docs/cli

## Should one commit the .firebaserc file?

https://stackoverflow.com/questions/43527359/what-is-the-practice-on-committing-firebase-files-in-a-nodejs-app

## Lessons learned

### Preserving symbolic links in Angular Client in order to work with common dir

Error: "*.ts is missing from the TypeScript compilation. Please make sure it is in your tsconfig via the 'files' or 'include' property"

https://github.com/angular/angular-cli/issues/9807

### Beware the "Expression has changed after it was checked" error!

You should redesign your view and how you're accessing your model.

https://hackernoon.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4

