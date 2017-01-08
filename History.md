
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

