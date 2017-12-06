var Plotly = require('@lib/index');
var Plots = require('@src/plots/plots');
var Lib = require('@src/lib');

var supplyDefaults = require('@src/traces/histogram/defaults');
var calc = require('@src/traces/histogram/calc');

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');


describe('Test histogram', function() {
    'use strict';

    describe('supplyDefaults', function() {
        var traceIn,
            traceOut;

        beforeEach(function() {
            traceOut = {};
        });

        it('should set visible to false when x or y is empty', function() {
            traceIn = {
                x: []
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.visible).toBe(false);

            traceIn = {
                y: []
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.visible).toBe(false);
        });

        it('should set visible to false when type is histogram2d and x or y are empty', function() {
            traceIn = {
                type: 'histogram2d',
                x: [],
                y: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.visible).toBe(false);

            traceIn = {
                type: 'histogram2d',
                x: [1, 2, 2],
                y: []
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.visible).toBe(false);

            traceIn = {
                type: 'histogram2d',
                x: [],
                y: []
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.visible).toBe(false);

            traceIn = {
                type: 'histogram2dcontour',
                x: [],
                y: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.visible).toBe(false);
        });

        it('should set orientation to v by default', function() {
            traceIn = {
                x: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.orientation).toBe('v');

            traceIn = {
                x: [1, 2, 2],
                y: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.orientation).toBe('v');
        });

        it('should set orientation to h when only y is supplied', function() {
            traceIn = {
                y: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.orientation).toBe('h');

        });

        // coercing bin attributes got moved to calc because it needs
        // axis type - so here we just test that it's NOT happening

        it('should not coerce autobinx regardless of xbins', function() {
            traceIn = {
                x: [1, 2, 2],
                xbins: {
                    start: 1,
                    end: 3,
                    size: 1
                }
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.autobinx).toBeUndefined();

            traceIn = {
                x: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.autobinx).toBeUndefined();
        });

        it('should not coerce autobiny regardless of ybins', function() {
            traceIn = {
                y: [1, 2, 2],
                ybins: {
                    start: 1,
                    end: 3,
                    size: 1
                }
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.autobiny).toBeUndefined();

            traceIn = {
                y: [1, 2, 2]
            };
            supplyDefaults(traceIn, traceOut, '', {});
            expect(traceOut.autobiny).toBeUndefined();
        });

        it('should inherit layout.calendar', function() {
            traceIn = {
                x: [1, 2, 3]
            };
            supplyDefaults(traceIn, traceOut, '', {calendar: 'islamic'});

            // we always fill calendar attributes, because it's hard to tell if
            // we're on a date axis at this point.
            // size axis calendar is weird, but *might* be able to happen if
            // we're using histfunc=min or max (does this work?)
            expect(traceOut.xcalendar).toBe('islamic');
            expect(traceOut.ycalendar).toBe('islamic');
        });

        it('should take its own calendars', function() {
            traceIn = {
                x: [1, 2, 3],
                xcalendar: 'coptic',
                ycalendar: 'nepali'
            };
            supplyDefaults(traceIn, traceOut, '', {calendar: 'islamic'});

            expect(traceOut.xcalendar).toBe('coptic');
            expect(traceOut.ycalendar).toBe('nepali');
        });
    });


    describe('calc', function() {
        function _calc(opts, extraTraces, layout) {
            var base = { type: 'histogram' };
            var trace = Lib.extendFlat({}, base, opts);
            var gd = { data: [trace] };

            if(layout) gd.layout = layout;

            if(Array.isArray(extraTraces)) {
                extraTraces.forEach(function(extraTrace) {
                    gd.data.push(Lib.extendFlat({}, base, extraTrace));
                });
            }

            Plots.supplyDefaults(gd);
            var fullTrace = gd._fullData[0];

            var out = calc(gd, fullTrace);
            delete out[0].trace;
            return out;
        }

        var oneDay = 24 * 3600000;

        it('should handle auto dates with nonuniform (month) bins', function() {
            // All data on exact years: shift so bin center is an
            // exact year, except on leap years
            var out = _calc({
                x: ['1970-01-01', '1970-01-01', '1971-01-01', '1973-01-01'],
                nbinsx: 4
            });

            // TODO: this gives half-day gaps between all but the first two
            // bars. Now that we have explicit per-bar positioning, perhaps
            // we should fill the space, rather than insisting on equal-width
            // bars?
            expect(out).toEqual([
                // full calcdata has x and y too (and t in the first one),
                // but those come later from setPositions.
                {b: 0, p: Date.UTC(1970, 0, 1), s: 2},
                {b: 0, p: Date.UTC(1971, 0, 1), s: 1},
                {b: 0, p: Date.UTC(1972, 0, 1, 12), s: 0},
                {b: 0, p: Date.UTC(1973, 0, 1), s: 1}
            ]);

            // All data on exact months: shift so bin center is on (31-day months)
            // or in (shorter months) that month
            out = _calc({
                x: ['1970-01-01', '1970-01-01', '1970-02-01', '1970-04-01'],
                nbinsx: 4
            });

            expect(out).toEqual([
                {b: 0, p: Date.UTC(1970, 0, 1), s: 2},
                {b: 0, p: Date.UTC(1970, 1, 1), s: 1},
                {b: 0, p: Date.UTC(1970, 2, 2, 12), s: 0},
                {b: 0, p: Date.UTC(1970, 3, 1), s: 1}
            ]);

            // data on exact days: shift so each bin goes from noon to noon
            // even though this gives kind of odd bin centers since the bins
            // are months... but the important thing is it's unambiguous which
            // bin any given day is in.
            out = _calc({
                x: ['1970-01-02', '1970-01-31', '1970-02-13', '1970-04-19'],
                nbinsx: 4
            });

            expect(out).toEqual([
                // dec 31 12:00 -> jan 31 12:00, middle is jan 16
                {b: 0, p: Date.UTC(1970, 0, 16), s: 2},
                // jan 31 12:00 -> feb 28 12:00, middle is feb 14 12:00
                {b: 0, p: Date.UTC(1970, 1, 14, 12), s: 1},
                {b: 0, p: Date.UTC(1970, 2, 16), s: 0},
                {b: 0, p: Date.UTC(1970, 3, 15, 12), s: 1}
            ]);
        });

        it('should handle auto dates with uniform (day) bins', function() {
            var out = _calc({
                x: ['1970-01-01', '1970-01-01', '1970-01-02', '1970-01-04'],
                nbinsx: 4
            });

            var x0 = 0,
                x1 = x0 + oneDay,
                x2 = x1 + oneDay,
                x3 = x2 + oneDay;

            expect(out).toEqual([
                {b: 0, p: x0, s: 2},
                {b: 0, p: x1, s: 1},
                {b: 0, p: x2, s: 0},
                {b: 0, p: x3, s: 1}
            ]);
        });

        it('should handle very small bins', function() {
            var out = _calc({
                x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                xbins: {
                    start: 0,
                    end: 10,
                    size: 0.001
                }
            });

            expect(out.length).toEqual(9001);
        });

        it('handles single-bin data without extra bins', function() {
            var out = _calc({
                x: [2.1, 3, 3.9],
                xbins: {start: 0, end: 10, size: 2}
            });

            expect(out).toEqual([
                {b: 0, p: 3, s: 3, width1: 2}
            ]);
        });

        it('handles single-value overlaid autobinned data with other manual bins', function() {
            var out = _calc({x: [1.1, 1.1, 1.1]}, [
                {x: [1, 2, 3, 4], xbins: {start: 0.5, end: 4.5, size: 2}},
                {x: [10, 10.5, 11, 11.5], xbins: {start: 9.8, end: 11.8, size: 0.5}}
            ], {
                barmode: 'overlay'
            });

            expect(out).toEqual([
                {b: 0, p: 1.1, s: 3, width1: 0.5}
            ]);
        });

        it('handles single-value overlaid autobinned data with other auto bins', function() {
            var out = _calc({x: ['', null, 17, '', 17]}, [
                {x: [10, 20, 30, 40]},
                {x: [100, 101, 102, 103]}
            ], {
                barmode: 'overlay'
            });

            expect(out).toEqual([
                {b: 0, p: 17, s: 2, width1: 2}
            ]);
        });

        it('handles multiple single-valued overlaid autobinned traces with different values', function() {
            var out = _calc({x: [null, 13, '', 13]}, [
                {x: [5]},
                {x: [null, 29, 29, 29, null]}
            ], {
                barmode: 'overlay'
            });

            expect(out).toEqual([
                {b: 0, p: 13, s: 2, width1: 8}
            ]);
        });

        it('handles multiple single-date overlaid autobinned traces with different values', function() {
            var out = _calc({x: [null, '2011-02-03', '', '2011-02-03']}, [
                {x: ['2011-02-05']},
                {x: [null, '2015-05-05', '2015-05-05', '2015-05-05', null]}
            ], {
                barmode: 'overlay'
            });

            expect(out).toEqual([
                {b: 0, p: 1296691200000, s: 2, width1: 2 * 24 * 3600 * 1000}
            ]);
        });

        it('handles several overlaid autobinned traces with only one value total', function() {
            var out = _calc({x: [null, 97, '', 97]}, [
                {x: [97]},
                {x: [null, 97, 97, 97, null]}
            ], {
                barmode: 'overlay'
            });

            expect(out).toEqual([
                {b: 0, p: 97, s: 2, width1: 1}
            ]);
        });

        function calcPositions(opts, extraTraces) {
            return _calc(opts, extraTraces).map(function(v) { return v.p; });
        }

        it('harmonizes autobins when all traces are autobinned', function() {
            var trace1 = {x: [1, 2, 3, 4]};
            var trace2 = {x: [5, 5.5, 6, 6.5]};

            expect(calcPositions(trace1)).toBeCloseToArray([0.5, 2.5, 4.5], 5);

            expect(calcPositions(trace2)).toBeCloseToArray([5.5, 6.5], 5);

            expect(calcPositions(trace1, [trace2])).toEqual([1, 2, 3, 4]);
            // huh, turns out even this one is an example of "unexpected bin positions"
            // (see another example below) - in this case it's because trace1 gets
            // autoshifted to keep integers off the bin edges, whereas trace2 doesn't
            // because there are as many integers as half-integers.
            // In this case though, it's unexpected but arguably better than the
            // "expected" result.
            expect(calcPositions(trace2, [trace1])).toEqual([5, 6, 7]);
        });

        it('can sometimes give unexpected bin positions', function() {
            // documenting an edge case that might not be desirable but for now
            // we've decided to ignore: a larger bin sets the bin start, but then it
            // doesn't quite make sense with the smaller bin we end up with
            // we *could* fix this by ensuring that the bin start is based on the
            // same bin spec that gave the minimum bin size, but incremented down to
            // include the minimum start... but that would have awkward edge cases
            // involving month bins so for now we're ignoring it.

            // all integers, so all autobins should get shifted to start 0.5 lower
            // than they otherwise would.
            var trace1 = {x: [1, 2, 3, 4]};
            var trace2 = {x: [-2, 1, 4, 7]};

            // as above... size: 2
            expect(calcPositions(trace1)).toBeCloseToArray([0.5, 2.5, 4.5], 5);

            // {size: 5, start: -5.5}: -5..-1, 0..4, 5..9
            expect(calcPositions(trace2)).toEqual([-3, 2, 7]);

            // unexpected behavior when we put these together,
            // because 2 and 5 are mutually prime. Normally you could never get
            // groupings 1&2, 3&4... you'd always get 0&1, 2&3...
            expect(calcPositions(trace1, [trace2])).toBeCloseToArray([1.5, 3.5], 5);
            expect(calcPositions(trace2, [trace1])).toBeCloseToArray([
                -2.5, -0.5, 1.5, 3.5, 5.5, 7.5
            ], 5);
        });

        it('harmonizes autobins with smaller manual bins', function() {
            var trace1 = {x: [1, 2, 3, 4]};
            var trace2 = {x: [5, 6, 7, 8], xbins: {start: 4.3, end: 7.1, size: 0.4}};

            expect(calcPositions(trace1, [trace2])).toBeCloseToArray([
                0.9, 1.3, 1.7, 2.1, 2.5, 2.9, 3.3, 3.7, 4.1
            ], 5);
        });

        it('harmonizes autobins with larger manual bins', function() {
            var trace1 = {x: [1, 2, 3, 4]};
            var trace2 = {x: [5, 6, 7, 8], xbins: {start: 4.3, end: 15, size: 7}};

            expect(calcPositions(trace1, [trace2])).toBeCloseToArray([
                0.8, 2.55, 4.3
            ], 5);
        });

        it('ignores traces on other axes', function() {
            var trace1 = {x: [1, 2, 3, 4]};
            var trace2 = {x: [5, 5.5, 6, 6.5]};
            var trace3 = {x: [1, 1.1, 1.2, 1.3], xaxis: 'x2'};
            var trace4 = {x: [1, 1.2, 1.4, 1.6], yaxis: 'y2'};

            expect(calcPositions(trace1, [trace2, trace3, trace4])).toEqual([1, 2, 3, 4]);
            expect(calcPositions(trace3)).toBeCloseToArray([0.9, 1.1, 1.3], 5);
        });

        describe('cumulative distribution functions', function() {
            var base = {
                x: [0, 5, 10, 15, 5, 10, 15, 10, 15, 15],
                y: [2, 2, 2, 14, 6, 6, 6, 10, 10, 2]
            };

            it('makes the right base histogram', function() {
                var baseOut = _calc(base);
                expect(baseOut).toEqual([
                    {b: 0, p: 2, s: 1},
                    {b: 0, p: 7, s: 2},
                    {b: 0, p: 12, s: 3},
                    {b: 0, p: 17, s: 4},
                ]);
            });

            var CDFs = [
                {p: [2, 7, 12, 17], s: [1, 3, 6, 10]},
                {
                    direction: 'decreasing',
                    p: [2, 7, 12, 17], s: [10, 9, 7, 4]
                },
                {
                    currentbin: 'exclude',
                    p: [7, 12, 17, 22], s: [1, 3, 6, 10]
                },
                {
                    direction: 'decreasing', currentbin: 'exclude',
                    p: [-3, 2, 7, 12], s: [10, 9, 7, 4]
                },
                {
                    currentbin: 'half',
                    p: [2, 7, 12, 17, 22], s: [0.5, 2, 4.5, 8, 10]
                },
                {
                    direction: 'decreasing', currentbin: 'half',
                    p: [-3, 2, 7, 12, 17], s: [10, 9.5, 8, 5.5, 2]
                },
                {
                    direction: 'decreasing', currentbin: 'half', histnorm: 'percent',
                    p: [-3, 2, 7, 12, 17], s: [100, 95, 80, 55, 20]
                },
                {
                    currentbin: 'exclude', histnorm: 'probability',
                    p: [7, 12, 17, 22], s: [0.1, 0.3, 0.6, 1]
                },
                {
                    // behaves the same as without *density*
                    direction: 'decreasing', currentbin: 'half', histnorm: 'density',
                    p: [-3, 2, 7, 12, 17], s: [10, 9.5, 8, 5.5, 2]
                },
                {
                    // behaves the same as without *density*, only *probability*
                    direction: 'decreasing', currentbin: 'half', histnorm: 'probability density',
                    p: [-3, 2, 7, 12, 17], s: [1, 0.95, 0.8, 0.55, 0.2]
                },
                {
                    currentbin: 'half', histfunc: 'sum',
                    p: [2, 7, 12, 17, 22], s: [1, 6, 19, 44, 60]
                },
                {
                    currentbin: 'half', histfunc: 'sum', histnorm: 'probability',
                    p: [2, 7, 12, 17, 22], s: [0.5 / 30, 0.1, 9.5 / 30, 22 / 30, 1]
                },
                {
                    direction: 'decreasing', currentbin: 'half', histfunc: 'max', histnorm: 'percent',
                    p: [-3, 2, 7, 12, 17], s: [100, 3100 / 32, 2700 / 32, 1900 / 32, 700 / 32]
                },
                {
                    direction: 'decreasing', currentbin: 'half', histfunc: 'min', histnorm: 'density',
                    p: [-3, 2, 7, 12, 17], s: [8, 7, 5, 3, 1]
                },
                {
                    currentbin: 'exclude', histfunc: 'avg', histnorm: 'probability density',
                    p: [7, 12, 17, 22], s: [0.1, 0.3, 0.6, 1]
                }
            ];

            CDFs.forEach(function(CDF) {
                var p = CDF.p,
                    s = CDF.s;

                it('handles direction=' + CDF.direction + ', currentbin=' + CDF.currentbin +
                        ', histnorm=' + CDF.histnorm + ', histfunc=' + CDF.histfunc, function() {
                    var traceIn = Lib.extendFlat({}, base, {
                        cumulative: {
                            enabled: true,
                            direction: CDF.direction,
                            currentbin: CDF.currentbin
                        },
                        histnorm: CDF.histnorm,
                        histfunc: CDF.histfunc
                    });
                    var out = _calc(traceIn);

                    expect(out.length).toBe(p.length);
                    out.forEach(function(outi, i) {
                        expect(outi.p).toBe(p[i]);
                        expect(outi.s).toBeCloseTo(s[i], 6);
                        expect(outi.b).toBe(0);
                    });
                });
            });
        });

    });

    describe('plot / restyle', function() {
        var gd;

        beforeEach(function() {
            gd = createGraphDiv();
        });

        afterEach(destroyGraphDiv);

        it('should update autobins correctly when restyling', function() {
            // note: I'm *not* testing what this does to gd.data, as that's
            // really a matter of convenience and will perhaps change later (v2?)
            var data1 = [1.5, 2, 2, 3, 3, 3, 4, 4, 5];
            Plotly.plot(gd, [{x: data1, type: 'histogram' }]);
            expect(gd._fullData[0].xbins).toEqual({start: 1, end: 6, size: 1});
            expect(gd._fullData[0].autobinx).toBe(true);

            // same range but fewer samples changes autobin size
            var data2 = [1.5, 5];
            Plotly.restyle(gd, 'x', [data2]);
            expect(gd._fullData[0].xbins).toEqual({start: -2.5, end: 7.5, size: 5});
            expect(gd._fullData[0].autobinx).toBe(true);

            // different range
            var data3 = [10, 20.2, 20, 30, 30, 30, 40, 40, 50];
            Plotly.restyle(gd, 'x', [data3]);
            expect(gd._fullData[0].xbins).toEqual({start: 5, end: 55, size: 10});
            expect(gd._fullData[0].autobinx).toBe(true);

            // explicit change to a bin attribute clears autobin
            Plotly.restyle(gd, 'xbins.start', 3);
            expect(gd._fullData[0].xbins).toEqual({start: 3, end: 55, size: 10});
            expect(gd._fullData[0].autobinx).toBe(false);

            // restart autobin
            Plotly.restyle(gd, 'autobinx', true);
            expect(gd._fullData[0].xbins).toEqual({start: 5, end: 55, size: 10});
            expect(gd._fullData[0].autobinx).toBe(true);
        });

        it('respects explicit autobin: false as a one-time autobin', function() {
            var data1 = [1.5, 2, 2, 3, 3, 3, 4, 4, 5];
            Plotly.plot(gd, [{x: data1, type: 'histogram', autobinx: false }]);
            // we have no bins, so even though autobin is false we have to autobin once
            expect(gd._fullData[0].xbins).toEqual({start: 1, end: 6, size: 1});
            expect(gd._fullData[0].autobinx).toBe(false);

            // since autobin is false, this will not change the bins
            var data2 = [1.5, 5];
            Plotly.restyle(gd, 'x', [data2]);
            expect(gd._fullData[0].xbins).toEqual({start: 1, end: 6, size: 1});
            expect(gd._fullData[0].autobinx).toBe(false);
        });

        it('allows changing axis type with new x data', function() {
            var x1 = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];
            var x2 = ['2017-01-01', '2017-01-01', '2017-01-01', '2017-01-02', '2017-01-02', '2017-01-03'];

            Plotly.newPlot(gd, [{x: x1, type: 'histogram'}]);
            expect(gd._fullLayout.xaxis.type).toBe('linear');
            expect(gd._fullLayout.xaxis.range).toBeCloseToArray([0.5, 4.5], 3);

            Plotly.restyle(gd, {x: [x2]});
            expect(gd._fullLayout.xaxis.type).toBe('date');
            expect(gd._fullLayout.xaxis.range).toEqual(['2016-12-31 12:00', '2017-01-03 12:00']);
        });

        it('can resize a plot with several histograms', function(done) {
            Plotly.newPlot(gd, [{
                type: 'histogram',
                x: [1, 1, 1, 1, 2, 2, 2, 3, 3, 4]
            }, {
                type: 'histogram',
                x: [1, 1, 1, 1, 2, 2, 2, 3, 3, 4]
            }], {
                width: 400,
                height: 400
            })
            .then(function() {
                expect(gd._fullLayout.width).toBe(400);
                expect(gd._fullLayout.height).toBe(400);

                gd._fullData.forEach(function(trace, i) {
                    expect(trace._autoBinFinished).toBeUndefined(i);
                });

                return Plotly.relayout(gd, {width: 500, height: 500});
            })
            .then(function() {
                expect(gd._fullLayout.width).toBe(500);
                expect(gd._fullLayout.height).toBe(500);

                gd._fullData.forEach(function(trace, i) {
                    expect(trace._autoBinFinished).toBeUndefined(i);
                });
            })
            .catch(fail)
            .then(done);
        });

        it('give the right bar width for single-bin histograms', function(done) {
            Plotly.newPlot(gd, [{
                type: 'histogram',
                x: [3, 3, 3],
                xbins: {start: 0, end: 10, size: 2}
            }])
            .then(function() {
                expect(gd._fullLayout.xaxis.range).toBeCloseToArray([2, 4], 3);
            })
            .catch(fail)
            .then(done);
        });
    });
});
