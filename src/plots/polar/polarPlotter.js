/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
'use strict';
var d3 = require('d3');
var Lib = require('../../lib');
var extendDeepAll = Lib.extendDeepAll;
var µ = module.exports = { version: '0.2.2' };
// The Legend is the "key" in the top right of the graph, displaying infomation on the various data on the graph
// Has the abbility to show and hide data for user ease
function exportPlots(config, dashArray) {
    console.log("dashArray", dashArray);
    console.log("hey");
    var geometryConfig = config[0].geometryConfig;
    var container = geometryConfig.container;
    if(typeof container === 'string') container = d3.select(container);
    container.datum(config).each(function(_config) {
        var isStack = !!_config[0].data.yStack;
        var data = _config.map(function(d) {
            if(isStack) return d3.zip(d.data.t[0], d.data.r[0], d.data.yStack[0]); else return d3.zip(d.data.t[0], d.data.r[0]);
        });

        // Test for negatives
        var dataNegativesFound = false;
        var lowestNegativePos = 0;
        var highestPos = 0;
        for(var numberOfEntries = 0; numberOfEntries < data[0].length; numberOfEntries++) {
            if(data[0][numberOfEntries][1] < 0) {
                dataNegativesFound = true;
                if(data[0][numberOfEntries][1] < data[0][lowestNegativePos][1]) {
                    // Get lowest val
                    lowestNegativePos = numberOfEntries;
                }
            } else {
                if(data[0][numberOfEntries][1] > data[0][highestPos][1]) {
                    // Get highest val
                    highestPos = numberOfEntries;
                }
            }
        }

        var angularScale = geometryConfig.angularScale;
        var domainMin = geometryConfig.radialScale.domain()[0];
        var generator = {};
        var polarTypeLine = false;
        var polarRCap = 180;
        var polarMove = 0;
        var locationRatio = 0;
        var zeroLoc = 0;

        // Create Ratio
        if(dataNegativesFound) {
            var results = moveOrigin(data, lowestNegativePos, highestPos, geometryConfig);
            polarMove = results[0];
            locationRatio = results[1];
            zeroLoc = results[2];

            //zeroLocation = zeroLoc;
            //zeroRatio = locationRatio;
            //polarMoved = polarMove;
        }

        generator.bar = function(d, i, pI) {
            var dataConfig = _config[pI].data;
            var h = geometryConfig.radialScale(d[1]) - geometryConfig.radialScale(0);
            var stackTop = geometryConfig.radialScale(d[2] || 0);
            var w = dataConfig.barWidth;
            d3.select(this).attr({
                'class': 'mark bar',
                d: 'M' + [ [ h + stackTop, -w / 2 ], [ h + stackTop, w / 2 ], [ stackTop, w / 2 ], [ stackTop, -w / 2 ] ].join('L') + 'Z',
                transform: function(d) {
                    return 'rotate(' + (geometryConfig.orientation + angularScale(d[0])) + ')';
                }
            });
        };
        generator.dot = function(d, i, pI) {
            var stackedData = d[2] ? [ d[0], d[1] + d[2] ] : d;
            var symbol = d3.svg.symbol().size(_config[pI].data.dotSize).type(_config[pI].data.dotType)(d, i);
            d3.select(this).attr({'class': 'mark dot', d: symbol, transform: function(d) {
                // Get polar coordinates so they can be manipulated/converted into cartesian coords
                var polarCoords = getPolarCoordinates(stackedData, 0, geometryConfig);
                // If negatives are found, scaling needs to occure alosngside ploting a new origin center
                polarCoords.r = polarRadiusShift(polarCoords, dataNegativesFound, locationRatio, polarRCap, polarMove, d, polarTypeLine, zeroLoc);
                var coord = convertToCartesian(polarCoords);
                return 'translate(' + [ coord.x, coord.y ] + ')';
            }
            });
        };
      
        var line = d3.svg.line.radial().interpolate(_config[0].data.lineInterpolation).radius(function(d) {
            var val = geometryConfig.radialScale(Math.abs(d[1]));
            if(dataNegativesFound) {
                if(locationRatio > 1) {
                    // Normlise the points because of the largest negative extremity
                    val = val * (polarRCap / polarMove);
                }
                if(d[1] < 0) {
                    if(locationRatio > 1) {
                        val = polarRCap - val;
                        val = val * (zeroLoc / polarRCap);
                    } else {
                        val = polarMove - val;
                        val = val * locationRatio;
                    }
                } else {
                    if(locationRatio > 1) {
                        val = polarRCap + val;
                        val = val * (zeroLoc / polarRCap);
                    } else {
                        val = polarMove + val;
                        val = val * locationRatio;
                    }
                }
            }
            return val;
        }).angle(function(d) {
            return geometryConfig.angularScale(d[0]) * Math.PI / 180;
            
        });

        generator.line = function(d, i, pI) {
            polarTypeLine = true;
            var lineData = d[2] ? data[pI].map(function(d) {
                return [ d[0], d[1] + d[2] ];
            }) : data[pI];
            d3.select(this).each(generator['dot']).style({
                opacity: function(dB, iB) {
                    return +_config[pI].data.dotVisible;
                },
                fill: markStyle.stroke(d, i, pI)
            }).attr({
                'class': 'mark dot'
            });

            if(i > 0) return;
            var lineSelection = d3.select(this.parentNode).selectAll('path.line').data([ 0 ]);
            lineSelection.enter().insert('path');
            lineSelection.attr({
                'class': 'line',
                d: line(lineData),
                transform: function() {
                    return 'rotate(' + (geometryConfig.orientation + 90) + ')';
                },
                'pointer-events': 'none'
            }).style({
                fill: function() {
                    return markStyle.fill(d, i, pI);
                },
                'fill-opacity': 0,
                stroke: function() {
                    return markStyle.stroke(d, i, pI);
                },
                'stroke-width': function() {
                    return markStyle['stroke-width'](d, i, pI);
                },
                'stroke-dasharray': function() {
                    return markStyle['stroke-dasharray'](d, i, pI);
                },
                opacity: function() {
                    return markStyle.opacity(d, i, pI);
                },
                display: function() {
                    return markStyle.display(d, i, pI);
                }
            });
        };
        var angularRange = geometryConfig.angularScale.range();
        var triangleAngle = Math.abs(angularRange[1] - angularRange[0]) / data[0].length * Math.PI / 180;
        var arc = d3.svg.arc().startAngle(function() {
            return -triangleAngle / 2;
        }).endAngle(function() {
            return triangleAngle / 2;
        }).innerRadius(function(d) {
            return geometryConfig.radialScale(domainMin + (d[2] || 0));
        }).outerRadius(function(d) {
            return geometryConfig.radialScale(domainMin + (d[2] || 0)) + geometryConfig.radialScale(d[1]);
        });
        generator.arc = function() {
            d3.select(this).attr({
                'class': 'mark arc',
                d: arc,
                transform: function(d) {
                    return 'rotate(' + (geometryConfig.orientation + angularScale(d[0]) + 90) + ')';
                }
            });
        };
        var markStyle = {
            fill: function(d, i, pI) {
                return _config[pI].data.color;
            },
            stroke: function(d, i, pI) {
                return _config[pI].data.strokeColor;
            },
            'stroke-width': function(d, i, pI) {
                return _config[pI].data.strokeSize + 'px';
            },
            'stroke-dasharray': function(d, i, pI) {
                return dashArray[_config[pI].data.strokeDash];
            },
            opacity: function(d, i, pI) {
                return _config[pI].data.opacity;
            },
            display: function(d, i, pI) {
                return typeof _config[pI].data.visible === 'undefined' || _config[pI].data.visible ? 'block' : 'none';
            }
        };
        var geometryLayer = d3.select(this).selectAll('g.layer').data(data);
        geometryLayer.enter().append('g').attr({
            'class': 'layer'
        });
        var geometry = geometryLayer.selectAll('path.mark').data(function(d, i) {
            return d;
        });
        geometry.enter().append('path').attr({
            'class': 'mark'
        });
        
        geometry.style(markStyle).each(generator[geometryConfig.geometryType]);
        geometry.exit().remove();
        geometryLayer.exit().remove();
    });
}

function polarRadiusShift(polarCoords, dataNegativesFound, locationRatio, polarRCap, polarMove,  d, polarTypeLine, zeroLoc) {
    if(dataNegativesFound) {
        // Are we dealing with the case in which our largest absolute value is negative
        // This results in the zero point being moved to a value greater than 90
        if(locationRatio > 1) {
            // Normlise the points because of the largest negative extremity
            polarCoords.r = polarCoords.r * (polarRCap / polarMove);
        }
        if(d[1] < 0) {
        // Deal with negative values, these need reploting and scaling to work around plotly engine
            if(locationRatio > 1) {
                polarCoords.r = polarRCap - polarCoords.r;
                polarCoords.r = polarCoords.r * (zeroLoc / polarRCap);
            } else {
                polarCoords.r = polarMove - polarCoords.r;
                if(polarTypeLine) {
                    polarCoords.r = polarCoords.r * locationRatio;
                }
            }
        } else {
            if(locationRatio > 1) {
                polarCoords.r = polarRCap + polarCoords.r;
                polarCoords.r = polarCoords.r * (zeroLoc / polarRCap);
                if(!polarTypeLine) {
                    polarCoords.r = polarCoords.r * locationRatio;
                }
            } else {
                polarCoords.r = polarMove + polarCoords.r;
                polarCoords.r = polarCoords.r * locationRatio;
            }
        }
    }
    return polarCoords.r;
}

function getPolarCoordinates(d, i, geometryConfig) {
    var r = geometryConfig.radialScale(Math.abs(d[1]));
    var t = ((geometryConfig.angularScale(d[0]) + geometryConfig.orientation)) * Math.PI / 180;
    return {
        r: r,
        t: t
    };
}

function convertToCartesian(polarCoordinates) {
    var x = polarCoordinates.r * Math.cos(polarCoordinates.t);
    var y = polarCoordinates.r * Math.sin(polarCoordinates.t);
    return {
        x: x,
        y: y
    };
}

function moveOrigin(data, lowestNegativePos, highestPos, geometryConfig) {
    var geometryConfigx = geometryConfig;
    var polarMove = getPolarCoordinates([data[0][lowestNegativePos][0], data[0][lowestNegativePos][1]], 0, geometryConfigx).r;
    var lowestPolar = Math.abs(data[0][lowestNegativePos][1]);
    var ratioTotal = Math.abs(data[0][lowestNegativePos][1]) + data[0][highestPos][1];
    var ratioSteps = 1 / ratioTotal;
    var ratioCreator = Math.abs(data[0][lowestNegativePos][1]) * ratioSteps;
    var locationRatio = 1;
    var zeroLoc = 0;
    if(Math.abs(data[0][lowestNegativePos][1]) > data[0][highestPos][1]) {
        locationRatio = 1 + (ratioCreator - 0.5);
        zeroLoc = 90 * locationRatio;
    } else {
        locationRatio = 1 - ratioCreator;
        zeroLoc = 180 - (180 * locationRatio);
    }
    return [polarMove, locationRatio, zeroLoc];
}

module.exports.exportPlots = exportPlots;
