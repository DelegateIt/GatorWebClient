# GatorWebClient

## Setup
The GatorCore repo contains the docker container for the delegator web server. If you do not want to go through the process of setting up docker, you can use a custom web server for developement since the files are all static. Python has a decent built in http server that you can use.

For python3: `python3 -m http.server 8080`
For python2: `python -m SimpleHTTPServer 8080`


## Configuring
By default the web client is set to 'local' mode where it tries to connect to the api running on your localhost. If you'd rather connect to the aws test api change the line at the end of `main.js` from `GAT.apiMode = "local"` to `GAT.apiMode = "test"`. Also you will have to change the facebook `appId` in `auth.js` to `922314864520407`.

