/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


var d3 = require('d3');
var Lib = require('../../lib');
var defaults = require('./defaults');
var utility = require('./utility');
var tooltip= require('./tooltip');
var legend= require('./legend');
var plotExports = require('./polarPlotter');
var extendDeepAll = Lib.extendDeepAll;
var MID_SHIFT = require('../../constants/alignment').MID_SHIFT;
var µ = module.exports = { version: '0.2.2' };
var radiansModeOn = false;
var polarOrginMovedAmount = 0;
var zeroPointLocation = 0;
var zeroPointLocationRatio =0;
var lowestPolar =0;
var polarTypeLine = false;
var highestDataValue=0;
var lowestDataValue=0;
var hasNegatives = false;
var polarRadiusMax = 180;
var POLAR_ID = 0;

// Render the Polar Plot
µ.Axis = function module(){
    var config = {data: [],layout: {}}, inputConfig = {}, liveConfig = {};
    var svg, container, dispatch = d3.dispatch('hover'), radialScale, angularScale;
    var exports = {};

    function render(_container,scaler,isRadianOn,chartID) {
        console.log("ID IS ",chartID);
        POLAR_ID = chartID;
        console.log("POLAR_ID ",POLAR_ID);
        radiansModeOn = isRadianOn;
        container = _container || container;
        var data = config.data;
        var axisConfig = config.layout;
        // Set container if container isnt set right ?
        if (typeof container == 'string' || container.nodeName) container = d3.select(container);
        container.datum(data).each(function(_data, _index) {
            var dataOriginal = _data.slice();
            liveConfig = {data: utility.cloneJson(dataOriginal),layout: utility.cloneJson(axisConfig)};
            // Adds lines between data (areas)
            dataOriginal = addSegementDividers(dataOriginal,axisConfig,liveConfig);
            // Get Data Types
            var data = getDataTypes(dataOriginal);
            // Check for stacked data 
            var isStackedCheckResult  = isStackedCheck(data,axisConfig);
            isStacked = isStackedCheckResult.isStacked;
            radius = isStackedCheckResult.radius;
            chartCenter = isStackedCheckResult.chartCenter;
            dataWithGroupId = isStackedCheckResult.dataWithGroupId;
            extent = isStackedCheckResult.extent;
            // Sets up the radial scale, used to generate meta data on the data supplied e.g ticks();
            if (axisConfig.radialAxis.domain != µ.DATAEXTENT) extent[0] = 0;
            radialScale = d3.scale.linear().domain(axisConfig.radialAxis.domain != µ.DATAEXTENT && axisConfig.radialAxis.domain ? axisConfig.radialAxis.domain : extent).range([0, radius ]);
            liveConfig.layout.radialAxis.domain = radialScale.domain();
            var angularDataMerged = utility.flattenArray(data.map(function(d, i) {
                return d.t;
            }));
            // Builds some data based on if the plot is ordinal
            var ordinalCheckOneResults = isOrdinalCheckOne(angularDataMerged,data,isStacked);
            data = ordinalCheckOneResults.data;
            ticks = ordinalCheckOneResults.ticks;
            angularDataMerged = ordinalCheckOneResults.angularDataMerged;
            isOrdinal = ordinalCheckOneResults.isOrdinal;
            // More variable setup
            var hasOnlyLineOrDotPlot = data.filter(function(d, i) {
                return d.geometry === 'LinePlot' || d.geometry === 'DotPlot';
            }).length === data.length;
            var graphDataResults = handlePlotTypes(axisConfig, isOrdinal, hasOnlyLineOrDotPlot,angularDataMerged);
            var angularDomainWithPadding = graphDataResults.angularDomainWithPadding;
            var needsEndSpacing = graphDataResults.needsEndSpacing;
            var angularDomainStep = graphDataResults.angularDomainStep;
            //Build axies and create addtional feilds
            var buildAxisResults = buildAxis(axisConfig,angularDomainWithPadding);
            var angularScale = buildAxisResults.angularScale;
            var angularAxisRange = buildAxisResults.angularAxisRange;
            liveConfig.layout.angularAxis.domain = angularScale.domain();
            liveConfig.layout.angularAxis.endPadding = needsEndSpacing ? angularDomainStep : 0;
            // Create svg
            svg = createSVG(this,d3);
            var lineStyle = {fill: 'none',stroke: axisConfig.tickColor};
            // Get font style, for the title and axis
            styles = buildFontStyle(axisConfig)
            fontStyle  = styles[0];
            titleStyle = styles[1];
            // Builds the legend, returning the container and the bounding box, returns changes
            legendData = buildLegend(axisConfig,svg,radius,data,radialScale,liveConfig);
            legendBBox = legendData.legendBBox;
            legendContainer = legendData.legendContainer;
            liveConfig = legendData.liveConfig;
            legendRadius = legendData.radius;
            chartCenterBuffer = legendData.chartCenterBuffer;
            // Check return makes sense
            if(typeof chartCenterBuffer !== "undefined"){
                chartCenter = chartCenterBuffer
            }
            //var chartGroup = svg.select('.chart-group'+POLAR_ID);
            var chartGroup = svg.select('.chart-group');
            console.log("chartGroup ", chartGroup);
            // Set Svg Attributes
            svgData = assignSvgAttributes(svg,axisConfig,legendBBox,legendRadius,chartGroup,chartCenter);
            svg = svgData[0];
            centeringOffset = svgData[1];
            // Create the radial Axis
            radialAxisData = createRadialAxis(svg,axisConfig,radialScale,lineStyle,legendRadius,data);
            var radialAxis = radialAxisData[0];
            var backgroundCircle = radialAxisData[1];
            // Could this be moved?
            function currentAngle(d, i) {
                return angularScale(d) % 360 + axisConfig.orientation;
            }
            // AngularAxis
            var angularAxis = svg.select('.angular.axis-group').selectAll('g.angular-tick').data(angularAxisRange);
            var angularAxisEnter = angularAxis.enter().append('g').classed('angular-tick', true);
            angularAxis = assignAngularAxisAttributes(angularAxis,currentAngle,axisConfig,angularAxisEnter,lineStyle,legendRadius,ticks,chartGroup);
            // GeometryContainer
            var hasGeometry = svg.select('g.geometry-group').selectAll('g').size() > 0;
            var geometryContainer = svg.select('g.geometry-group').selectAll('g.geometry').data(data);
            geometryContainer = assignGeometryContainerAttributes(geometryContainer,data,radialScale,angularScale,axisConfig,scaler,radialScale);
            var guides = svg.select('.guides-group');
            // Tooltips Creation
            var tooltipContainer = svg.select('.tooltips-group');

            // Displays Degree's Value
            var angularTooltip = tooltip.tooltipPanel().config({
                container: tooltipContainer,
                fontSize: 8
            })();

            // Displays Distance Value
            var radialTooltip = tooltip.tooltipPanel().config({
                container: tooltipContainer,
                fontSize: 8
            })();

            var geometryTooltip = tooltip.tooltipPanel().config({
                container: tooltipContainer,
                hasTick: true
            })();
            // Checks if plot type is ordinal and add angular tool tip if so
            isOrdinalCheckTwo(isOrdinal,guides,chartGroup,legendRadius,axisConfig,angularScale,angularTooltip,chartCenter,backgroundCircle)
            var angularGuideCircle = guides.select('circle').style({
                stroke: 'grey',
                fill: 'none'
            });
            // Outer ring display
            var chartGroupdata =  outerRingValueDisplay(chartGroup,radius,radialTooltip,angularGuideCircle,radialScale,axisConfig,chartCenter,geometryTooltip,angularTooltip,data,backgroundCircle);
            chartGroup = chartGroupdata[0];
            // Displays box with result values in
            svgMouserHoverDisplay(isOrdinal,geometryTooltip,ticks,data,svg);
        });
        return exports;
    }
    // Render function called from the manager to intitate polar plotting
    exports.render = function(_container,scaler,isRadianOn,ID) {
        render(_container,scaler,isRadianOn,ID);
        return this;
    };
    // Define polar config
    exports.config = function(_x) {
        if (!arguments.length) return config;

        var xClone = utility.cloneJson(_x);
        xClone.data.forEach(function(d, i) {
            if (!config.data[i]) config.data[i] = {};
            extendDeepAll(config.data[i], µ.Axis.defaultConfig().data[0]);
            extendDeepAll(config.data[i], d);
        });
        extendDeepAll(config.layout, µ.Axis.defaultConfig().layout);
        extendDeepAll(config.layout, xClone.layout);
        return this;
    };
    exports.getLiveConfig = function() {
        return liveConfig;
    };
    exports.getinputConfig = function() {
        return inputConfig;
    };
    exports.radialScale = function(_x) {
        return radialScale;
    };
    exports.angularScale = function(_x) {
        return angularScale;
    };
    exports.svg = function() {
        return svg;
    };
    d3.rebind(exports, dispatch, 'on');
    
    return exports;
};

µ.Axis.defaultConfig = function(d, i) {
    var config = defaults.defaultConfig();
    return config;
};
// Build polar plot types
plotExports.definePlotTypes(µ);
// Build polar plots
µ.PolyChart = function module() {
    var config = [ µ.PolyChart.defaultConfig() ];
    var dispatch = d3.dispatch('hover');

    var colorScale;
    function exports() {
        var dashArray = {
            solid: 'none',
            dash: [ 5, 2 ],
            dot: [ 2, 5 ]
        };

        var isStack = !!config[0].data.yStack;
        var data = config.map(function(d) {
            if(isStack) return d3.zip(d.data.t[0], d.data.r[0], d.data.yStack[0]); else return d3.zip(d.data.t[0], d.data.r[0]);
        });

        // Define the plotted points / lines / area segments 
        // Returns data needed to deal with a shifted origin
        containerData = plotExports.exportPlots(config, dashArray,highestDataValue,lowestDataValue,hasNegatives);
        zeroPointLocation = containerData.zeroLoc;
        polarOrginMovedAmount = containerData.polarMove;
        zeroPointLocationRatio = containerData.locationRatio;
        polarTypeLine = containerData.polarTypeLine;
        polarRadiusMax = containerData.polarRCap;
    }
    exports.config = function(_x) {
        if (!arguments.length) return config;
        _x.forEach(function(d, i) {
            if (!config[i]) config[i] = {};
            extendDeepAll(config[i], µ.PolyChart.defaultConfig());
            extendDeepAll(config[i], d);
        });
        return this;
    };
    exports.getColorScale = function() {
        return colorScale;
    };
    d3.rebind(exports, dispatch, 'on');
    return exports;
};

µ.PolyChart.defaultConfig = function() {
    var config = defaults.polyChartDefaultConfig();
    return config;
};

µ.BarChart = function module() {
    return µ.PolyChart();
};

µ.BarChart.defaultConfig = function() {
    var config = {
        geometryConfig: {
            geometryType: 'bar'
        }
    };
    return config;
};

µ.AreaChart = function module() {
    return µ.PolyChart();
};

µ.AreaChart.defaultConfig = function() {
    var config = {
        geometryConfig: {
            geometryType: 'arc'
        }
    };
    return config;
};

µ.DotPlot = function module() {
    return µ.PolyChart();
};

µ.DotPlot.defaultConfig = function() {
    var config = defaults.dotPlotDefaultConfig();
    return config;
};

µ.LinePlot = function module() {
    return µ.PolyChart();
};

µ.LinePlot.defaultConfig = function() {
    var config = defaults.linePlotDefaultConfig();
    return config;
};

legend.Legend.defaultConfig = function(d, i) {
    var config = defaults.legendDefaultConfig();
    return config;
};
tooltip.tooltipPanel.uid = 1;

// Creation of Legend
function buildLegend(axisConfig,svg,radius,data,radialScale,liveConfig){
    var legendContainer;
    var legendBBox;
    var chartCenter;
    if (axisConfig.showLegend) {
        legendContainer = svg.select('.legend-group').attr({
            transform: 'translate(' + [ radius, axisConfig.margin.top ] + ')'
        }).style({
            display: 'block'
        });
        // Defines plot point names 
        var elements = data.map(function(d, i) {
            var datumClone = utility.cloneJson(d);
            datumClone.symbol = d.geometry === 'DotPlot' ? d.dotType || 'circle' : d.geometry != 'LinePlot' ? 'square' : 'line';
            datumClone.visibleInLegend = typeof d.visibleInLegend === 'undefined' || d.visibleInLegend;
            datumClone.color = d.geometry === 'LinePlot' ? d.strokeColor : d.color;
            return datumClone;
        });
        // Uses legend.js to build elements of the legend and power addtional functionailty e.g. show hide data
        legend.Legend(POLAR_ID).config({
            data: data.map(function(d, i) {
                return d.name || 'Element' + i;
            }),
            legendConfig: extendDeepAll({},
                legend.Legend.defaultConfig().legendConfig,
                {
                    container: legendContainer,
                    elements: elements,
                    reverseOrder: axisConfig.legend.reverseOrder
                }
            )
        })();

        legendBBox = legendContainer.node().getBBox();
        radius = Math.min(axisConfig.width - legendBBox.width - axisConfig.margin.left - axisConfig.margin.right, axisConfig.height - axisConfig.margin.top - axisConfig.margin.bottom) / 2;
        radius = Math.max(10, radius);
        chartCenter = [ axisConfig.margin.left + radius, axisConfig.margin.top + radius ];
        radialScale.range([ 0, radius ]);
        liveConfig.layout.radialAxis.domain = radialScale.domain();
        legendContainer.attr('transform', 'translate(' + [ chartCenter[0] + radius, chartCenter[1] - radius ] + ')');
    } else {
        legendContainer = svg.select('.legend-group').style({
            display: 'none'
        });
    }
    return {"legendBBox": legendBBox,"legendContainer": legendContainer,"liveConfig" : liveConfig,"radius" : radius,"chartCenter" : chartCenter}
}

function buildFontStyle(axisConfig){
    var titleStyle = {'font-indicationbar': axisConfig.font};
    var fontStyle = {
        'font-size': axisConfig.font.size,
        'font-family': axisConfig.font.family,
        fill: axisConfig.font.color,
        'text-shadow': [ '-1px 0px', '1px -1px', '-1px 1px', '1px 1px' ].map(function(d, i) {
            return ' ' + d + ' 0 ' + axisConfig.font.outlineColor;
        }).join(',')
    };
    // Added feature to alter the title, will use default font features if aspect is not found
    // Gets font size if possible
    if(axisConfig.titlefont == undefined){
        var titleStyle = fontStyle;
    }else{
        try{
            var titleStyle = {'font-size': axisConfig.titlefont.size};
        } catch(err){
            var titleStyle = {'font-size': axisConfig.font.size};
        }
        // Gets font type
        try{
            titleStyle = Object.assign(titleStyle, {'font-family': axisConfig.titlefont.family});
        } catch(err){
            titleStyle = Object.assign(titleStyle, {'font-family': axisConfig.font.family});
        }
        // Get font colour
        try{
            titleStyle = Object.assign(titleStyle, {fill: axisConfig.titlefont.color});
        } catch(err){
            titleStyle = Object.assign(titleStyle, {fill: axisConfig.font.color});
        }
        // Get text shadow
        try{
            titleStyle = Object.assign(titleStyle, {'text-shadow': [ '-1px 0px', '1px -1px', '-1px 1px', '1px 1px' ].map(function(d, i) {return ' ' + d + ' 0 ' + axisConfig.font.outlineColor;}).join(',')});
        } catch(err){
            titleStyle = Object.assign(titleStyle, {'text-shadow': [ '-1px 0px', '1px -1px', '-1px 1px', '1px 1px' ].map(function(d, i) {return ' ' + d + ' 0 ' + axisConfig.font.outlineColor;}).join(',')});
        }
    }
    return [fontStyle,titleStyle]
}
// SVG is the HTML container used to hold most of the plotly elements
function createSVG(self,d3){

    var svg = d3.select(self).select('svg.chart-root');
    if (!(typeof svg === 'undefined' || svg.empty())) {
        var svgElement = self.getElementsByClassName('chart-root');
        svgElement[0].parentElement.removeChild(svgElement[0]);
    } 
    
    var skeleton = "<svg xmlns='http://www.w3.org/2000/svg' class='chart-root'>' + '<g class='outer-group'>' + '<g class='chart-group'>' + '<circle class='background-circle"+POLAR_ID+"'></circle>' + '<g class='geometry-group'></g>' + '<g class='radial axis-group'>' + '<circle class='outside-circle'></circle>' + '</g>' + '<g class='angular axis-group'></g>' + '<g class='guides-group'><line></line><circle r='0'></circle></g>' + '</g>' + '<g class='legend-group'></g>' + '<g class='tooltips-group'></g>' + '<g class='title-group'><text></text></g>' + '</g>' + '</svg>";
        var doc = new DOMParser().parseFromString(skeleton, 'application/xml');
        var newSvg = self.appendChild(self.ownerDocument.importNode(doc.documentElement, true));
        svg = d3.select(newSvg);
    //}
    svg.select('.guides-group').style({
        'pointer-events': 'none'
    });
    svg.select('.angular.axis-group').style({
        'pointer-events': 'none'
    });
    svg.select('.radial.axis-group').style({
        'pointer-events': 'none'
    });
    return svg;
}
// SVG positioning
function assignSvgAttributes(svg,axisConfig,legendBBox,radius,chartGroup,chartCenter){
    svg.attr({width: axisConfig.width, height: axisConfig.height}).style({opacity: axisConfig.opacity});
    chartGroup.attr('transform', 'translate(' + chartCenter + ')').style({cursor: 'crosshair'});
    var centeringOffset = [ (axisConfig.width - (axisConfig.margin.left + axisConfig.margin.right + radius * 2 + (legendBBox ? legendBBox.width : 0))) / 2, (axisConfig.height - (axisConfig.margin.top + axisConfig.margin.bottom + radius * 2)) / 2 ];
    centeringOffset[0] = Math.max(0, centeringOffset[0]);
    centeringOffset[1] = Math.max(0, centeringOffset[1]);
    svg.select('.outer-group').attr('transform', 'translate(' + centeringOffset + ')');
    if (axisConfig.title) {
        var title = svg.select('g.title-group text').style(titleStyle).text(axisConfig.title);
        var titleBBox = title.node().getBBox();
        title.attr({
            x: chartCenter[0] - titleBBox.width / 2,
            y: chartCenter[1] - radius - 20
        });
    }
    return [svg,centeringOffset]
    
}
// Radial axis created
// Controlls the axis's rotational possition on the plot
// Identifies max and lowest values that will be plotted, max value can be over the axis to ensure linear axis distrubution 
function createRadialAxis(svg,axisConfig,radialScale,lineStyle,radius,plotData){
    var radialAxis = svg.select('.radial.axis-group');
    if (axisConfig.radialAxis.gridLinesVisible) {
        // Defines the number of circle layers on the plot by getting the number of stages in the axis 
        // Note:- (radialScale).ticks(5) cannot deal with negative values - making it tricky when dealing with negative values 
        var gridCircles = radialAxis.selectAll('circle.grid-circle').data((radialScale).ticks(5));
        gridCircles.enter().append('circle').attr({
            'class': 'grid-circle'
        }).style(lineStyle);
        gridCircles.attr('r', radialScale);
        gridCircles.exit().remove();
    }
    radialAxis.select('circle.outside-circle').attr({
        r: radius
    }).style(lineStyle);
    var backgroundCircle = svg.select('circle.background-circle'+POLAR_ID).attr({
        r: radius
    }).style({
        fill: axisConfig.backgroundColor,
        stroke: axisConfig.stroke
    });
    if (axisConfig.radialAxis.visible) {
        var axis = d3.svg.axis().scale(radialScale).ticks(5).tickSize(5);
        radialAxis.call(axis).attr({
            transform: 'rotate(' + axisConfig.radialAxis.orientation + ')'
        });
        var axisAngle = {'indicationbar': axisConfig.indicationBar};
        if(axisAngle["indicationbar"]!== undefined) {
            radialAxis.call(axis).attr({
                transform: 'rotate(' +axisAngle["indicationbar"]+ ')'
            });
        }
        radialAxis.selectAll('.domain').style(lineStyle);
        // Test for negatives 
        var dataNegativesFound = false;
        var scaleValues = (radialScale).ticks(5);
        var highestVal = scaleValues[scaleValues.length-1];
        var lowestVal =0;
        // Stores the result of the new axis
        var negativeAxis = [];
        // Get meta data on the input data
        var metaData = getMetaData(plotData);
        dataNegativesFound = metaData.dataNegativesFound;
        hasNegatives = dataNegativesFound;
        lowestVal = metaData.lowestVal;
        highestValPos = metaData.highestValPos;
        lowestValPos = metaData.lowestValPos;
        // If negatives are found a new scale has to be created manually to deal with code flaws of plotly
        if(dataNegativesFound) {
            lowestDataValue = [plotData[lowestValPos[0]].r[0][lowestValPos[1]],plotData[lowestValPos[0]].t[0][lowestValPos[1]]];
            highestDataValue = [plotData[highestValPos[0]].r[0][highestValPos[1]],plotData[highestValPos[0]].t[0][highestValPos[1]]];
            var steps = (radialScale).ticks(5).length -1;
            var interval = (Math.abs(highestVal) - lowestVal)/steps;
            negativeAxis = [lowestVal];
            for(var count = 1; count <= steps;count++){
                negativeAxis.push((lowestVal+(interval*count)).toPrecision(2));
            }
        }
        radialAxis.selectAll('g>text').text(function(d, i) {
            if(dataNegativesFound) {
                return negativeAxis[i] + axisConfig.radialAxis.ticksSuffix;
            }
            // Deal with negative changes
            return this.textContent + axisConfig.radialAxis.ticksSuffix;
        
        }).style(fontStyle).style({
            'text-anchor': 'start'
        }).attr({
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
            transform: function(d, i) {
                if (axisConfig.radialAxis.tickOrientation === 'horizontal') {
                    return 'rotate(' + -axisConfig.radialAxis.orientation + ') translate(' + [ 0, fontStyle['font-size'] ] + ')';
                } else return 'translate(' + [ 0, fontStyle['font-size'] ] + ')';
            }
        });
        radialAxis.selectAll('g>line').style({
            stroke: 'black'
        });
    }
    return [radialAxis,backgroundCircle]
}
// Takes in the plot data, returns usefull data about the plot points provided 
function getMetaData(plotData){
    var dataNegativesFound = false;
    var highestVal = 0;
    var highestValPos = 0;
    var lowestVal =0;
    var lowestValPos =0;
    for(var numberOfData = 0;numberOfData<plotData.length;numberOfData++){
        for(var counter = 0;counter<plotData[numberOfData].r[0].length;counter++){
            if(plotData[numberOfData].r[0][counter] >= highestVal) {
                highestVal = plotData[numberOfData].r[0][counter];
                highestValPos = [numberOfData,counter];
            }
            if(plotData[numberOfData].r[0][counter] < lowestVal) {
                lowestVal = plotData[numberOfData].r[0][counter];
                lowestValPos = [numberOfData,counter];
            }
            if(plotData[numberOfData].r[0][counter]< 0 ) {
                dataNegativesFound = true;
            }
        }
    }
    return {"dataNegativesFound": dataNegativesFound, "highestVal": highestVal, "lowestVal":lowestVal,
            "highestValPos": highestValPos,"lowestValPos": lowestValPos,"dataNegativesFound": dataNegativesFound}
}

function assignAngularAxisAttributes(angularAxis,currentAngle,axisConfig,angularAxisEnter,lineStyle,radius,ticks,chartGroup){
    // Renders Axis to the screen
    angularAxis.attr({transform: function(d, i) {
            return 'rotate(' + currentAngle(d, i) + ')';
        }
    }).style({
        display: axisConfig.angularAxis.visible ? 'block' : 'none'
    });

    angularAxis.exit().remove();

    angularAxisEnter.append('line').classed('grid-line', true).classed('major', function(d, i) {
        return i % (axisConfig.minorTicks + 1) == 0;
    }).classed('minor', function(d, i) {
        return !(i % (axisConfig.minorTicks + 1) == 0); 
    }).style(lineStyle);

    angularAxisEnter.selectAll('.minor').style({stroke: axisConfig.minorTickColor});

    angularAxis.select('line.grid-line').attr({
        x1: axisConfig.tickLength ? radius - axisConfig.tickLength : 0,
        x2: radius
    }).style({
        display: axisConfig.angularAxis.gridLinesVisible ? 'block' : 'none'
    });

    angularAxisEnter.append('text').classed('axis-text', true).style(fontStyle);
    var ticksText = angularAxis.select('text.axis-text').attr({
        x: radius + axisConfig.labelOffset,
        dy: MID_SHIFT + 'em',
        transform: function(d, i) {
            var angle = currentAngle(d, i);
            var rad = radius + axisConfig.labelOffset;
            var orient = axisConfig.angularAxis.tickOrientation;
            if (orient == 'horizontal') return 'rotate(' + -angle + ' ' + rad + ' 0)';
            else if (orient == 'radial') return angle < 270 && angle > 90 ? 'rotate(180 ' + rad + ' 0)' : null;
                else return 'rotate(' + (angle <= 180 && angle > 0 ? -90 : 90) + ' ' + rad + ' 0)';
        }
    }).style({
        'text-anchor': 'middle',
        display: axisConfig.angularAxis.labelsVisible ? 'block' : 'none'
    }).text(function(d, i) {
        if (i % (axisConfig.minorTicks + 1) != 0) return '';
        if (ticks) {
            // Deal with area plots axies
            return ticks[d] + axisConfig.angularAxis.ticksSuffix;
        } else{
            // Deal with other polar plots axies
            return (renderAxies(d, i, axisConfig));
        }
    }).style(fontStyle);
    if (axisConfig.angularAxis.rewriteTicks) ticksText.text(function(d, i) {
        if (i % (axisConfig.minorTicks + 1) != 0) return '';
        return axisConfig.angularAxis.rewriteTicks(this.textContent, i);
    });

    var rightmostTickEndX = d3.max(chartGroup.selectAll('.angular-tick text')[0].map(function(d, i) {
        return d.getCTM().e + d.getBBox().width;
    }));

    legendContainer.attr({
        transform: 'translate(' + [ radius + rightmostTickEndX, axisConfig.margin.top ] + ')'
    });
    return angularAxis
}
// Checks if plot type is ordinal, if so then displays a angular tool tip
function isOrdinalCheckOne(angularDataMerged,data,isStacked){
    var ticks;
    var isOrdinal = typeof angularDataMerged[0] === 'string';
    if (isOrdinal) {
        angularDataMerged = utility.deduplicate(angularDataMerged);
        ticks = angularDataMerged.slice();
        angularDataMerged = d3.range(angularDataMerged.length);
        data = data.map(function(d, i) {
            var result = d;
            d.t = [ angularDataMerged ];
            if (isStacked) result.yStack = d.yStack;
            return result;
        });
    }
    return {"data": data,"ticks": ticks,"angularDataMerged": angularDataMerged,"isOrdinal": isOrdinal}
}
// Checks if plot type requires angular tooltip, if so; then adds one.
// Can alter this value between and angle and radian based on radiansModeOn
function isOrdinalCheckTwo(isOrdinal, guides, chartGroup, radius, axisConfig, angularScale, angularTooltip, chartCenter,backgroundCircle) {
    if (!isOrdinal) {
        var angularGuideLine = guides.select('line').attr({
            x1: 0,
            y1: 0,
            y2: 0
        }).style({
            stroke: 'grey',
            'pointer-events': 'none'
        });
        chartGroup.on('mousemove.angular-guide', function(d, i) {
            var mouseAngle = utility.getMousePos(backgroundCircle).angle;
            angularGuideLine.attr({
                x2: -radius,
                transform: 'rotate(' + mouseAngle + ')'
            }).style({
                opacity: .5
            });
            var angleWithOriginOffset = (mouseAngle + 180 + 360 - axisConfig.orientation) % 360;
            angularValue = angularScale.invert(angleWithOriginOffset);
            // Display radians on tool tip
            if(radiansModeOn){
                angularValue = ((parseInt(angularValue)*Math.PI)/180).toPrecision(3);
            }
            var pos = utility.convertToCartesian(radius + 12, mouseAngle + 180);
            angularTooltip.text(utility.round(angularValue)).move([ pos[0] + chartCenter[0], pos[1] + chartCenter[1] ]);
        }).on('mouseout.angular-guide', function(d, i) {
            guides.select('line').style({
                opacity: 0
            });
        });

    }
    
}

function assignGeometryContainerAttributes(geometryContainer, data, radialScale, angularScale, axisConfig, scale, radialScale){
    var radialScaleValues = radialScale.ticks(5);
    var getMaxVal = radialScaleValues[radialScaleValues.length -1 ];
    for(var numberOfData = 0;numberOfData<data.length;numberOfData++){
        
        rs = [];
        rt = [];
        for(var counter = 0;counter<data[numberOfData].r[0].length;counter++){
            rs.push(data[numberOfData].r[0][counter]*scale);
            rt.push(data[numberOfData].t[0][counter]);
        }
        data[numberOfData].r[0] = rs;
        data[numberOfData].t[0] = rt;
    }

    geometryContainer.enter().append('g').attr({
        'class': function(d, i) {
            return 'geometry geometry' + i;
        }
    });

    geometryContainer.exit().remove();
    if (data[0] || hasGeometry) {
        
        var geometryConfigs = [];
        data.forEach(function(d, i) {
            var geometryConfig = {};
            geometryConfig.radialScale = radialScale;
            geometryConfig.angularScale = angularScale;
            geometryConfig.container = geometryContainer.filter(function(dB, iB) {
                return iB == i;
            });
            geometryConfig.geometry = d.geometry;
            geometryConfig.orientation = axisConfig.orientation;
            geometryConfig.direction = axisConfig.direction;
            geometryConfig.index = i;
            geometryConfigs.push({
                data: d,
                geometryConfig: geometryConfig
            });         
        });

        var geometryConfigsGrouped = d3.nest().key(function(d, i) {
            return typeof d.data.groupId != 'undefined' || 'unstacked';
        }).entries(geometryConfigs);

        var geometryConfigsGrouped2 = [];
        geometryConfigsGrouped.forEach(function(d, i) {
            if (d.key === 'unstacked') geometryConfigsGrouped2 = geometryConfigsGrouped2.concat(d.values.map(function(d, i) {
                return [ d ];
            })); else geometryConfigsGrouped2.push(d.values);
        });

        geometryConfigsGrouped2.forEach(function(d, i) {
            var geometry;
            if (Array.isArray(d)) geometry = d[0].geometryConfig.geometry; else geometry = d.geometryConfig.geometry;
            var finalGeometryConfig = d.map(function(dB, iB) {
                return extendDeepAll(µ[geometry].defaultConfig(), dB);
            });
            µ[geometry]().config(finalGeometryConfig)();
        });
        
    }
    return geometryContainer
}
// Displays overlay when point is hoverd over
function svgMouserHoverDisplay(isOrdinal, geometryTooltip, ticks, data, svg){
    svg.selectAll('.geometry-group .mark').on('mouseover.tooltip', function(d, i) {
        var el = d3.select(this);
        var color = this.style.fill;
        var newColor = 'black';
        var opacity = this.style.opacity || 1;
        var name = "N/A"
        el.attr({
            'data-opacity': opacity
        });
        if (color && color !== 'none') {
            el.attr({
                'data-fill': color
            });
            newColor = d3.hsl(color).darker().toString();
            el.style({
                fill: newColor,
                opacity: 1
            });
            if(radiansModeOn){
                var textData = {
                    t: ((parseInt(d[0])*Math.PI)/180).toPrecision(3),
                    r: utility.round(d[1]),              
                };
            }else{
                var textData = {
                    t: utility.round(d[0]),
                    r: utility.round(d[1]),              
                };
            }
            // Get the objects name attach it with to resulting object text
            for(var i = 0;i<dataWithGroupId.length;i++){
                // Remove spaces to get run comparison
                dataColour = color.replace(/\s+/g, '');
                if(dataColour == dataWithGroupId[i].color){
                    name = dataWithGroupId[i].name;
                }
            }   
            // Check if data name should be displayed
            var text
            if (isOrdinal) textData.t = ticks[d[0]];
            if (name == "N/A"){
                text = 't: ' + textData.t + ', r: ' + textData.r;
            }else{
                text = 't: ' + textData.t + ', r: ' + textData.r + ', N: ' + name;
            }
            var bbox = this.getBoundingClientRect();
            var svgBBox = svg.node().getBoundingClientRect();
            var pos = [ bbox.left + bbox.width / 2 - centeringOffset[0] - svgBBox.left, bbox.top + bbox.height / 2 - centeringOffset[1] - svgBBox.top ];
            geometryTooltip.config({color: newColor}).text(text);
            geometryTooltip.move(pos);
        } else {
            color = this.style.stroke || 'black';
            el.attr({
                'data-stroke': color
            });
            newColor = d3.hsl(color).darker().toString();
            el.style({
                stroke: newColor,
                opacity: 1
            });
        }
    }).on('mousemove.tooltip', function(d, i) {
        if (d3.event.which != 0) return false;
        if (d3.select(this).attr('data-fill')) geometryTooltip.show();
    }).on('mouseout.tooltip', function(d, i) {
        geometryTooltip.hide();
        var el = d3.select(this);
        var fillColor = el.attr('data-fill');
        if (fillColor) el.style({
            fill: fillColor,
            opacity: el.attr('data-opacity')
        }); else el.style({
            stroke: el.attr('data-stroke'),
            opacity: el.attr('data-opacity')
        });
    });
}

function outerRingValueDisplay(chartGroup, radius, radialTooltip, angularGuideCircle, radialScale, axisConfig, chartCenter, geometryTooltip, angularTooltip,data,backgroundCircle) {
    chartGroup.on('mousemove.radial-guide', function(d, i) {
        var r = utility.getMousePos(backgroundCircle).radius;
        angularGuideCircle.attr({
            r: r
        }).style({
            opacity: .5
        });
        radialValue = radialScale.invert(utility.getMousePos(backgroundCircle).radius);
        var pos = utility.convertToCartesian(r, axisConfig.radialAxis.orientation);
        var polarCoordRadius = utility.getMousePos(backgroundCircle).radius;
        var metaData = getMetaData(data);
        var dataNegatives = metaData[0];
        // Invert the polar shift due to the negative values
        polarCoordRadius =  invertPolarRadiusShift(dataNegatives, polarCoordRadius, zeroPointLocation, zeroPointLocationRatio, polarRadiusMax, polarTypeLine, polarOrginMovedAmount, radialScale);
        radialValue = radialScale.invert(polarCoordRadius);
        // Display value 
        radialTooltip.text(utility.round(radialValue)).move([ pos[0] + chartCenter[0], pos[1] + chartCenter[1] ]);
    }).on('mouseout.radial-guide', function(d, i) {
        angularGuideCircle.style({
            opacity: 0
        });
        geometryTooltip.hide();
        angularTooltip.hide();
        radialTooltip.hide();
    });
    return chartGroup
}
// Used to undo the changes made when ploting point in order to get back to an orignal value
function invertPolarRadiusShift(dataNegatives, polarCoordRadius, zeroLocation, zeroRatio, polarRCap, PolarTypeLine, polarMoved, radialScale){
    if(dataNegatives){
        if(polarCoordRadius < zeroLocation){
            if(zeroRatio>1){

                axisScaled = (radialScale).ticks(5);
                if(axisScaled[ axisScaled.length - 1] < highestDataValue[0]) {
                    polarCoordRadius = (polarCoordRadius / polarRCap) * 185;
                }
                polarCoordRadius = zeroLocation - polarCoordRadius;
                polarCoordRadius = (polarCoordRadius / zeroLocation) * polarRCap;
            }else{
                if(PolarTypeLine){
                    polarCoordRadius = polarCoordRadius /zeroRatio;
                }
                polarCoordRadius = polarMoved - polarCoordRadius;
            }
            polarCoordRadius = polarCoordRadius * -1;
        }else{
            if(zeroRatio>1){
                axisScaled = (radialScale).ticks(5);
                if(axisScaled[ axisScaled.length - 1] < highestDataValue[0]) {
                    polarCoordRadius = (polarCoordRadius / polarRCap) * 185;
                }
                polarCoordRadius = -zeroLocation + polarCoordRadius;
                polarCoordRadius = (polarCoordRadius / zeroLocation) * polarRCap;

            }else{
                polarCoordRadius = polarCoordRadius /zeroRatio;
                polarCoordRadius = polarCoordRadius - polarMoved;
            }
        }
        if(zeroRatio>1){
            // Normlise the points because of the largest negative extremity
            polarCoordRadius = (polarCoordRadius/polarRCap)*polarMoved;
        }
       
    }
    return polarCoordRadius;
}
// The pie splits in the area plots 
function addSegementDividers(dataOriginal, axisConfig, liveConfig){
    var colorIndex = 0;
    dataOriginal.forEach(function(d, i) {
        if (!d.color) {
            d.color = axisConfig.defaultColorRange[colorIndex];
            colorIndex = (colorIndex + 1) % axisConfig.defaultColorRange.length;
        }
        if (!d.strokeColor) {
            d.strokeColor = d.geometry === 'LinePlot' ? d.color : d3.rgb(d.color).darker().toString();
        }
        liveConfig.data[i].color = d.color;
        liveConfig.data[i].strokeColor = d.strokeColor;
        liveConfig.data[i].strokeDash = d.strokeDash;
        liveConfig.data[i].strokeSize = d.strokeSize;
    });
    return dataOriginal
}

function isStackedCheck(data, axisConfig) {
    var isStacked = false;
    var dataWithGroupId = data.map(function(d, i) {
        isStacked = isStacked || typeof d.groupId !== 'undefined';
        return d;
    });

    if (isStacked) {
        var grouped = d3.nest().key(function(d, i) {
            return typeof d.groupId != 'undefined' ? d.groupId : 'unstacked';
        }).entries(dataWithGroupId);
        var dataYStack = [];
        var stacked = grouped.map(function(d, i) {
            if (d.key === 'unstacked') return d.values; else {
                var prevArray = d.values[0].r.map(function(d, i) {
                    return 0;
                });
                d.values.forEach(function(d, i, a) {
                    d.yStack = [ prevArray ];
                    dataYStack.push(prevArray);
                    prevArray = utility.sumArrays(d.r, prevArray);
                });
                return d.values;
            }
        });
        data = d3.merge(stacked);
    }
    data.forEach(function(d, i) {
        d.t = Array.isArray(d.t[0]) ? d.t : [ d.t ];
        d.r = Array.isArray(d.r[0]) ? d.r : [ d.r ];
    });
    var radius = Math.min(axisConfig.width - axisConfig.margin.left - axisConfig.margin.right, axisConfig.height - axisConfig.margin.top - axisConfig.margin.bottom) / 2;
    radius = Math.max(10, radius);
    var chartCenter = [ axisConfig.margin.left + radius, axisConfig.margin.top + radius ];
    var extent;
    if (isStacked) {
        var highestStackedValue = d3.max(utility.sumArrays(utility.arrayLast(data).r[0], utility.arrayLast(dataYStack)));
        extent = [ 0, highestStackedValue ];
    } else extent = d3.extent(utility.flattenArray(data.map(function(d, i) {
        return d.r;
    })));
    return {"isStacked": isStacked,"radius": radius,"chartCenter": chartCenter,"dataWithGroupId": dataWithGroupId,"extent": extent}
}

function getDataTypes(dataOriginal) {
    return(dataOriginal.filter(function(d, i) {
        var visible = d.visible;
        return typeof visible === 'undefined' || visible === true;
    })) 
}
             
function handlePlotTypes(axisConfig, isOrdinal, hasOnlyLineOrDotPlot,angularDataMerged) {
    var needsEndSpacing = axisConfig.needsEndSpacing === null ? isOrdinal || !hasOnlyLineOrDotPlot : axisConfig.needsEndSpacing;
    var useProvidedDomain = axisConfig.angularAxis.domain && axisConfig.angularAxis.domain != µ.DATAEXTENT && !isOrdinal && axisConfig.angularAxis.domain[0] >= 0;
    var angularDomain = useProvidedDomain ? axisConfig.angularAxis.domain : d3.extent(angularDataMerged);
    var angularDomainStep = Math.abs(angularDataMerged[1] - angularDataMerged[0]);

    if (hasOnlyLineOrDotPlot && !isOrdinal) angularDomainStep = 0;
    var angularDomainWithPadding = angularDomain.slice();
    if (needsEndSpacing && isOrdinal) angularDomainWithPadding[1] += angularDomainStep;
    return {"angularDomainWithPadding": angularDomainWithPadding,"needsEndSpacing": needsEndSpacing,"angularDomainStep": angularDomainStep};
}

function buildAxis(axisConfig, angularDomainWithPadding) {
    // Number of Axies
    // Tests if user had defined a set amount, if so uses that instead of the default
    var Default_Axies_Number = 4;
    var angleLabelStep = {'angleLabelStep': axisConfig.angleLabelStep};
    if(angleLabelStep["angleLabelStep"]!== undefined) {
        var tickCount = axisConfig.angularAxis.ticksCount || angleLabelStep["angleLabelStep"];
    }else{
        var tickCount = axisConfig.angularAxis.ticksCount || Default_Axies_Number;
    }
    // Create the interval value to create the range
    angularAxisRange = buildAxiesRange(axisConfig, tickCount, angularDomainWithPadding);
    // Return the result once addtional Axies had been applied
    return(buildAddtionalAxies(axisConfig, angularAxisRange, angularDomainWithPadding));
}

function buildAddtionalAxies(axisConfig, angularAxisRange, angularDomainWithPadding) {
        // create adtional axies than just the basic one provided, whether this happens is built read from the config created by the user.
        var angleLabels = {'angleLabels': axisConfig.angleLabels};
        if(angleLabels.angleLabels !== undefined){
        var vals = Object.keys(angleLabels).map(function(key) {
                for(var counter = 0;counter < angleLabels[key].length;counter++) {
                    if(!(angularAxisRange.includes(angleLabels[key][counter].val))) {
                        angularAxisRange.push((angleLabels[key][counter].val));
                    }
                }
            });
        }
        // ADDTIONAL VALUES END
        angularScale = d3.scale.linear().domain(angularDomainWithPadding.slice(0, 2)).range(axisConfig.direction === 'clockwise' ? [ 0, 360 ] : [ 360, 0 ]);
        return  {"angularScale": angularScale,"angularAxisRange": angularAxisRange}
}

function buildAxiesRange(axisConfig, tickCount, angularDomainWithPadding) {
    // Creates the core list of degree axies
    if (tickCount > 8) tickCount = tickCount / (tickCount / 8) + tickCount % 8;
    if (axisConfig.angularAxis.ticksStep) {
        tickCount = (angularDomainWithPadding[1] - angularDomainWithPadding[0]) / tickCount;
    }
    var angularTicksStep = axisConfig.angularAxis.ticksStep || (angularDomainWithPadding[1] - angularDomainWithPadding[0]) / (tickCount * (axisConfig.minorTicks + 1));
    if (ticks) angularTicksStep = Math.max(Math.round(angularTicksStep), 1);
    if (!angularDomainWithPadding[2]) angularDomainWithPadding[2] = angularTicksStep;
    // Create the range of values used on the axies
    var angularAxisRange = d3.range.apply(this, angularDomainWithPadding);
    angularAxisRange = angularAxisRange.map(function(d, i) {
        return parseFloat(d.toPrecision(12));
    });
    // Return the degree points from which axies will be drawn
    return angularAxisRange;
}

function renderAxies(d, i, axisConfig){
    if(radiansModeOn){
        // Display for Radians
        var addtionalLabels = getAngleLabels(d, i, axisConfig);
        if(addtionalLabels != ""){
            return addtionalLabels;
        }
        return ((parseInt(d)*Math.PI)/180).toPrecision(3).toString() + axisConfig.angularAxis.ticksSuffix;
    } else {
        // Display for Degrees
        var addtionalLabels = getAngleLabels(d, i, axisConfig);
        if(addtionalLabels != ""){
            return addtionalLabels;
        }
        return d + axisConfig.angularAxis.ticksSuffix;
    }
}

function getAngleLabels(d, i, axisConfig){
    var angleLabels = {'angleLabels': axisConfig.angleLabels}; 
    var addtionalLabels = "";
    if(angleLabels.angleLabels !== undefined){
        addtionalLabels = Object.keys(angleLabels).map(function(key) {
            for(var counter = 0;counter < angleLabels[key].length;counter++){
                if(d == angleLabels[key][counter].val.toString()) {
                    return angleLabels[key][counter].label.toString();
                }
            }
        });
    }
    return addtionalLabels
}

function moveOrigin(data, lowestNegativePos, highestPos, geometryConfig){
    var geometryConfigx = geometryConfig;
    var polarMove = getPolarCoordinates([data[0][lowestNegativePos][0],data[0][lowestNegativePos][1]],0,geometryConfigx).r;
    lowestPolar = Math.abs(data[0][lowestNegativePos][1])
    var ratioTotal = Math.abs(data[0][lowestNegativePos][1]) + data[0][highestPos][1];
    var ratioSteps = 1/ratioTotal;
    var ratioCreator = Math.abs(data[0][lowestNegativePos][1])*ratioSteps;
    var locationRatio = 1;
    if( Math.abs(data[0][lowestNegativePos][1]) > data[0][highestPos][1]) {
        locationRatio = 1 + (ratioCreator-0.5);
        var zeroLoc = 90*locationRatio;
    }else {
        locationRatio = 1 - ratioCreator;
        var zeroLoc = 180-(180*locationRatio);
    }
    return[polarMove, locationRatio, zeroLoc]
}

function polarRadiusShift(polarCoords, dataNegativesFound, locationRatio, polarRCap, polarMove,  d, polarTypeLine, zeroLoc) {
    if(dataNegativesFound) {
        // Are we dealing with the case in which our largest absolute value is negative
        // This results in the zero point being moved to a value greater than 90
        if(locationRatio>1){
            // Normlise the points because of the largest negative extremity
            polarCoords.r = polarCoords.r*(polarRCap/polarMove);
        }
        if(d[1]< 0){
        // Deal with negative values, these need reploting and scaling to work around plotly engine
            if(locationRatio>1){
                polarCoords.r = polarRCap - polarCoords.r
                polarCoords.r = polarCoords.r*(zeroLoc/polarRCap);
            }else{
                polarCoords.r = polarMove - polarCoords.r
                if(polarTypeLine){
                    polarCoords.r = polarCoords.r *locationRatio;
                }
            }
        }else{
                if(locationRatio>1){
                    polarCoords.r = polarRCap + polarCoords.r;
                    polarCoords.r = polarCoords.r*(zeroLoc/polarRCap);
                    if(!polarTypeLine){
                        polarCoords.r = polarCoords.r *locationRatio;
                    }
                }else{
                    polarCoords.r = polarMove + polarCoords.r;
                    polarCoords.r = polarCoords.r *locationRatio;
                }
        }
    }
    return polarCoords.r;
}



