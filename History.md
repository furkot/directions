
1.0.6 / 2018-08-15
==================

 * pass options to avoid highwas and tolls to Valhalla

1.0.5 / 2018-07-28
==================

 * make max point for Valhalla configurable and default to 2

1.0.4 / 2018-07-25
==================

 * return no route (empty result) only when all queried routes timeouted

1.0.3 / 2018-07-25
==================

 * use decode utility uniformly
 * @pirxpilot/google-polyline 2.0.3 -> 2.2.0

1.0.2 / 2018-07-07
==================

 * fix units for Valhalla

1.0.1 / 2018-06-22
==================

 * let next service calculate route when Valhalla cannot find any
 * let next service calculate route when MapQuest cannot find any
 * return empty directions when no route is found

1.0.0 / 2018-06-03
==================

 * openroute service directions
 * support multiple providers of the same service

0.0.29 / 2018-05-11
===================

 * replace lodash.defaults with Object.assign
 * change mapzen to valhalla

0.0.28 / 2017-12-04
===================

 * cascade to the next service when route cannot be found

0.0.27 / 2017-11-16
===================

 * set flexible options only when GraphHopper plan in use supports them

0.0.26 / 2017-11-07
===================

 * GraphHopper Routing API
 * increase google directions limit to 25
 * fix test to work with node 8
 * update node versions used for testing

0.0.25 / 2017-10-31
===================

 * cascade to the next service when google cannot find directions and seasonal roads are permitted

0.0.24 / 2017-10-31
===================

 * allow order of services to be determined by the client

0.0.23 / 2017-10-31
===================

 * prefer mapquest over mapzen

0.0.22 / 2017-05-14
===================

 * use a subset of geodesy module

0.0.21 / 2017-04-15
===================

 * update deprecated dependencies

0.0.20 / 2017-04-06
===================

 * fix link to repo displayed by npm

0.0.19 / 2017-02-20
===================

 * include the last point of the path returned by the Mapzen service

0.0.18 / 2017-01-28
===================

 * return partial results in case of error or timeout

0.0.17 / 2017-01-21
===================

 * collect request statistics
 * fix reusing the same structure for query that resuls in multiple requests

0.0.16 / 2017-01-20
===================

 * code42day-google-polyline 2.0.1 -> 2.0.2

0.0.15 / 2017-01-17
===================

 * convert coordinates when querying Google in China
 * eviltransform 0.2.2

0.0.14 / 2017-01-16
===================

 * use documented 'status' parameter instead of undocumented response field to determine the result of Google Maps API directions query
 * allow requests to return meaningful response with HTTP status other than 200

0.0.13 / 2017-01-14
===================

 * use the same limiter for all Google requests
 * simplify unwiding outstanding requests upon abort
 * skip limiter interval when not executing a request because query has been aborted
 * limiter-component 0.2.1 -> 1.0.0

0.0.12 / 2017-01-13
===================

 * split query after determining that the service is supposed to handle it
 * enforce one limiter per service regardless the number of instances of furkot directions
 * refactor directions service to streamline aborting on timeout
 * debug logging of 'query over limit' condition when using google or google web service
 * debug@2.6.0
 * only invoke enabled services
 * code42day-vis-why 1.1.4 -> 1.1.6

0.0.11 / 2017-01-10
===================

 * equate no response with empty (i.e. no route available)
 * fix checking Maquest status
 * fix Google Maps API response status

0.0.10 / 2017-01-10
===================

 * fix OSRM request format
 * fix response format after switching to fetch agent
 * fix cascading to the next service

0.0.9 / 2017-01-08
==================

 * option to set the length of simplified paths

0.0.8 / 2017-01-08
==================

 * refactor simplify route path
 * simplify route path after processing response
 * refactor OSRM service

0.0.7 / 2017-01-04
==================

 * OSMR as a main routing engine for driving
 * replace superagent with fetchagent

0.0.6 / 2016-12-27
==================

 * Mapzen Turn-by-turn Directions Service
 * invoke a service only when explicitly enabled
 * fix links to travis and gemnasium

0.0.5 / 2016-12-23
==================

 * replace polyline-encoded with code42day-google-polyline

0.0.4 / 2016-12-15
==================

 * handle timing out requests that take too long
 * return the name of provider supplying the directions

0.0.3 / 2016-12-12
==================

 * simplify path
 * cascade to Google Directions Web Service when Google Maps API Directions Service fails to find a route possibly because of seasonal closure
 * include seasonal routes on request
 * provide detailed turn-by-turn directions on request only
 * fix MapQuest travel mode and distance calculation

0.0.2 / 2016-12-05
==================

 * configure service keys and urls outside the module

0.0.1 / 2016-12-04
==================

 * Google Directions Web Service
 * MapQuest Directions Service
 * Google Maps API Directions Service

