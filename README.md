![topolr-server](https://github.com/topolr/topolr-server/raw/master/logo.png)
---------------------------
[![Build Status](https://travis-ci.org/topolr/topolr-server.svg?branch=master)](https://travis-ci.org/topolr/topolr-server)
[![npm version](https://badge.fury.io/js/topolr-server.svg)](https://badge.fury.io/js/topolr-server)
[![npm](https://img.shields.io/npm/dt/topolr-server.svg?maxAge=2592000)](https://www.npmjs.com/package/topolr-server)
[![license](https://img.shields.io/github/license/topolr/topolr-server.svg?maxAge=2592000)](https://github.com/topolr/topolr-server/blob/master/LICENSE)

Web server of topolr

## What is topolr-server

topolr-server is a web server running javascript code, supports multiple projects, and ROOT as the default project. It is similar to Java Tomcat server, default resolution `.csp` file, which is a packet (specific wording javascript files) container.topolr-server is a nodejs module container.

> Please refer to packet [BrightJS doc](http://brightjs.org "BrightJS")

## Quick Start

**step 1**: install topolr-server

`npm install topolr-server -g`

**step 2**:

`$ topolr-server add <projectname>,<projectpath>`

**step 3**:

goto the project folder to create the controllers.

**step 4**

run the server `$ topolr-server start`


## Project directory structure

```
project
   ├─node_modules (forbidden) => $ npm install <module> --save
   ├─WEBINF (forbidden)
   │    ├─src
   │    │  └─<code>
   │    └─web.json
   ├─<assets>
   ├─...
   ├─index.html
   └─package.json
```

- **WEBINF** Is the project of a protected directory can not be accessed outside
- **WEBINF/src** is a packet drop directory (similar to java package management system)
- **WEBINF/web.json** is the profile of the project
- **WEBINF** directory can be placed outside other static resources
- **node_modules** the third part module folder installed by npm command.

> Third-party modules can co-exist with the project, the project can not references to each other between the third-party modules.Of course, you can use a global third-party modules.

## Operating Mechanism

Would start separately configured service project when a project starts, all the services are started after the project start is completed. After the completion of the project started, the request will come one by one through the filter chain processing, and then return.

>Use the built-in framework to define mvcservice and mvcfilter in web.json file project

## web.json

- **Page** for covered server default page
- **upload** set encoding,max form size,tmp folder
- **Service** is used to configure the service to start with the project
- **Filter** is used to configure a request through a filter

### topolr-server provides predefined service

- mvcservice for implementing initialization mvc functions
  - **database** database configuration
     - **host** database IP
     - **port** database port
     - **debug** debug mode is turned on
     - **database** database name
     - **user** database user name
     - **password** database password
     - **connectionLimit** the maximum number of connections
  - **view**
     - **path** template path
     - **suffix** suffix template


### corgi provided predefined filter
- mvcfilter function for implementing mvc
- cachefilter for implementing the browser cache function files - etag: true open etag - cacheSetting: {default: 200000} cache Last-modified time is used to control the Cache-control
- zipfilter for implementing the response with gzip compression - gzip: "js, css" what file extension provisions gzip compression - deflate: "png" file suffix provisions which deflate compression

## server config

server config under the `conf/server.json` file control

- **Port** server port, default 8080
- **Modules** server load module defaults to `lib/modules/base.js`
- **ipc** set process comunication option
  - **socketPath** ipc socketpath
  - **port** ipc port
  - **host** ipc host
- **log** set server log file path
  - **server** server log path
  - **daemon** daemon process log path

> Custom modules arranged in this order basis having


## web config

web config under the `conf/web.json` file control

- **Session**
   - Timeout session timeout (in milliseconds)
- **CspCache** csp page caching is turned on, if you turn the page is loaded once
- **Page** default server configuration page
- **Mime** mime type configuration

## Custom server module

Server modules need to be placed under `lib / modules /` directory and each Module to determine a good inheritance.

### Custom module global object

**project object**

- `isOuterProject()` whether the project as external project (project initiated by the configuration file, instead of in webapps run as folders)
- `getPacketPath()` packet directory project
- `getProjectPath()` project directory
Configuration information object
- `getProjectConfig()` project
- `getProjectName()` Project Name Whether there are key attributes hasAttr (key) projects the global cache
- `getAttr(key)` Gets the value of key projects from the global cache
- `setAttr(key, value)` to set key-value cache to the global project


**packetLoader object**

- `get(name, option)` Get packet instance
- `has(name)` to determine whether packet contains definitions
- `each(fn)` through all packet definitions

**topolr-server**

- `getServiceConfig()` Gets the object serverConfig
- `getWebConfig()` Gets Global web Config Object
- `getCspContent(path)` Gets csp file contents
- `setTemplateMacro(key, fn)` set a custom label templates globally

**serverConfig**

- `getHost()`
- `getPort()`
- `getModules()`
- `getBasePath()`
- `getConfigPath()`

**webConfig**

- `getSessionConfig()`
- `getSessionTimeout()`
- `getPagePath()`
- `getMimeType()`
- `getBasePath()`
- `getConfigPath()`
- `isCspCache()`

**projectConfig**

- `getService()`
- `getFilter()`
- `hasFilter()`
- `hasService()`
- `getPagePath()`
- `hasPage()`
- `getServiceSize()`
- `getFilterSize()`

## See the demos in webapps

webapps/ROOT default project

## See the blog demo

Sample blog topolr-blog->[github](https://github.com/topolr/topolr-blog "github")

**Execute the command and then run the blog**

```
$ topolr-server install <projectName> <localFolder> https://github.com/topolr/topolr-blog/archive/master.zip
```
> this command will download the zip file,and build it,then you can run it with topolr-server.
> with this command you can update your site too.

## Run topolr-server

start without daemon process

```
$ topolr-server -run
```
start without topolr-server daemon process,but you can also daemon it by `nohup` in linux,or use forever.js.

```
$ nohup topolr-server -run &
```
start topolr-server with topolr-server daemon

```
$ topolr-server -start
```

## topolr-server useage

```
Useage:
    version        show server version
    info           check server basic info
    run            start server without deamon process and no log
    start          start service
    stop           stop all service
    restart        restart service
    status         show the server running status
    daemonpid      show the service process id
    config <--prop>,<value>
                   check and set server config
                   --port        : server port
                   --log-path    : server log path
                   --log-level   : server log level
                   --log-maxsize : server log maxsize
                   ...
    projects       list projects of server
    add <projectName>,<projectPath>
                   add a project to the server
    remove <projectName>
                   remove porject with project name
    edit <projectName>,<projectPath>
                   edit project info
```

