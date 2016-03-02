# GatorWebClient

## Setup Docker
You can use a whatever web server you want for developement since the files are all static. Python has a decent built in http server that you can use.

First "cd" into the `www` directory in this repo. Then run:

For python3: `python3 -m http.server 8080`

For python2: `python -m SimpleHTTPServer 8080`

## Configuring
The config file for the web client is `www/js/config.js`. Sample configs are located in the `config` directory. By default the "local" config is used which tries to connect to the API/Socketio servers running on localhost. If you're using the Docker Toolbox, then the API/Socketio won't be running on localhost but in a vm on a different IP. So you will have to change the hostnames in `www/js/config.js` to whatever ip your vm was assigned. Alternatively, you can configure VirtualBox to port forward ports 8000, 8060 to the vm. 

