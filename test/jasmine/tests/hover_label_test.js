var d3 = require('d3');

var Plotly = require('@lib/index');
var Fx = require('@src/components/fx');
var Lib = require('@src/lib');
var HOVERMINTIME = require('@src/components/fx').constants.HOVERMINTIME;

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var mouseEvent = require('../assets/mouse_event');
var click = require('../assets/click');
var delay = require('../assets/delay');
var doubleClick = require('../assets/double_click');
var fail = require('../assets/fail_test');

var customAssertions = require('../assets/custom_assertions');
var assertHoverLabelStyle = customAssertions.assertHoverLabelStyle;
var assertHoverLabelContent = customAssertions.assertHoverLabelContent;

describe('hover info', function() {
    'use strict';

    var mock = require('@mocks/14.json');
    var evt = { xpx: 355, ypx: 150 };

    afterEach(destroyGraphDiv);

    describe('hover info', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: '1',
                axis: '0.388'
            });
        });
    });

    describe('hover info x', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].hoverinfo = 'x';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover x', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({axis: '0.388'});
        });
    });

    describe('hover info y', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].hoverinfo = 'y';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover y', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({nums: '1'});
        });
    });

    describe('hover info text', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].text = [];
        // we convert newlines to spaces
        // see https://github.com/plotly/plotly.js/issues/746
        mockCopy.data[0].text[17] = 'hover\ntext\n\rwith\r\nspaces\n\nnot\rnewlines';
        mockCopy.data[0].hoverinfo = 'text';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover text', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: 'hover text  with spaces  not newlines'
            });
        });
    });

    describe('hover info all', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].text = [];
        mockCopy.data[0].text[17] = 'hover text';
        mockCopy.data[0].hoverinfo = 'all';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover all', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: '1\nhover text',
                name: 'PV learning ...',
                axis: '0.388'
            });
        });
    });

    describe('hover info with bad name', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].text = [];
        mockCopy.data[0].text[17] = 'hover text';
        mockCopy.data[0].hoverinfo = 'all';
        mockCopy.data[0].name = '<img src=x onerror=y>';
        mockCopy.data.push({
            x: [0.002, 0.004],
            y: [12.5, 16.25],
            mode: 'lines+markers',
            name: 'another trace'
        });

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('cleans the name', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: '1\nhover text',
                name: '&lt;img src=x o...',
                axis: '0.388'
            });
        });
    });

    describe('hover info y on log axis', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].hoverinfo = 'y';

        beforeEach(function(done) {
            for(var i = 0; i < mockCopy.data[0].y.length; i++) {
                mockCopy.data[0].y[i] *= 1e9;
            }

            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover y', function() {
            Fx.hover('graph', evt, 'xy');

            assertHoverLabelContent({nums: '1e+9'});
        });
    });

    describe('hover info y+text', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].text = [];
        mockCopy.data[0].text[17] = 'hover text';
        mockCopy.data[0].hoverinfo = 'y+text';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover y+text', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: '1\nhover text'
            });
        });
    });

    describe('hover info x+text', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].text = [];
        mockCopy.data[0].text[17] = 'hover text';
        mockCopy.data[0].hoverinfo = 'x+text';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover x+text', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: 'hover text',
                axis: '0.388'
            });
        });
    });

    describe('hover error x text (log axis positive)', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].error_x = { array: [] };
        mockCopy.data[0].error_x.array[17] = 1;

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover x+text', function() {
            Fx.hover('graph', evt, 'xy');

            assertHoverLabelContent({
                nums: '1',
                axis: '0.388 ± 1'
            });
        });
    });

    describe('hover error text (log axis 0)', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].error_x = { array: [] };
        mockCopy.data[0].error_x.array[17] = 0;

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover x+text', function() {
            Fx.hover('graph', evt, 'xy');

            assertHoverLabelContent({
                nums: '1',
                axis: '0.388'
            });
        });
    });

    describe('hover error text (log axis negative)', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].error_x = { array: [] };
        mockCopy.data[0].error_x.array[17] = -1;

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover x+text', function() {
            Fx.hover('graph', evt, 'xy');

            assertHoverLabelContent({
                nums: '1',
                axis: '0.388'
            });
        });
    });

    describe('hover info text with html', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].text = [];
        mockCopy.data[0].text[17] = 'hover<br>text';
        mockCopy.data[0].hoverinfo = 'text';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('responds to hover text with html', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({
                nums: 'hover\ntext'
            });
        });
    });

    describe('hover info skip', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].hoverinfo = 'skip';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('does not hover if hover info is set to skip', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            expect(gd._hoverdata, undefined);
            assertHoverLabelContent({});
        });
    });

    describe('hover info none', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        mockCopy.data[0].hoverinfo = 'none';

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mockCopy.data, mockCopy.layout).then(done);
        });

        it('does not render if hover is set to none', function() {
            var gd = document.getElementById('graph');
            Fx.hover('graph', evt, 'xy');

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.curveNumber).toEqual(0);
            expect(hoverTrace.pointNumber).toEqual(17);
            expect(hoverTrace.x).toEqual(0.388);
            expect(hoverTrace.y).toEqual(1);

            assertHoverLabelContent({});
        });
    });

    describe('\'closest\' hover info (superimposed case)', function() {
        var mockCopy = Lib.extendDeep({}, mock);

        // superimposed traces
        mockCopy.data.push(Lib.extendDeep({}, mockCopy.data[0]));
        mockCopy.layout.hovermode = 'closest';

        var gd;

        beforeEach(function(done) {
            gd = createGraphDiv();
            Plotly.plot(gd, mockCopy.data, mockCopy.layout).then(done);
        });

        it('render hover labels of the above trace', function() {
            Fx.hover('graph', evt, 'xy');

            expect(gd._hoverdata.length).toEqual(1);

            var hoverTrace = gd._hoverdata[0];

            expect(hoverTrace.fullData.index).toEqual(1);
            expect(hoverTrace.curveNumber).toEqual(1);
            expect(hoverTrace.pointNumber).toEqual(16);
            expect(hoverTrace.x).toEqual(0.33);
            expect(hoverTrace.y).toEqual(1.25);

            assertHoverLabelContent({
                nums: '(0.33, 1.25)',
                name: 'PV learning ...'
            });
        });

        it('render only non-hoverinfo \'none\' hover labels', function(done) {

            Plotly.restyle(gd, 'hoverinfo', ['none', 'name']).then(function() {
                Fx.hover('graph', evt, 'xy');

                expect(gd._hoverdata.length).toEqual(1);

                var hoverTrace = gd._hoverdata[0];

                expect(hoverTrace.fullData.index).toEqual(1);
                expect(hoverTrace.curveNumber).toEqual(1);
                expect(hoverTrace.pointNumber).toEqual(16);
                expect(hoverTrace.x).toEqual(0.33);
                expect(hoverTrace.y).toEqual(1.25);

                assertHoverLabelContent({
                    nums: 'PV learning ...'
                });
            })
            .then(done);
        });
    });

    describe('\'hover info for x/y/z traces', function() {
        function _hover(gd, xpx, ypx) {
            Fx.hover(gd, { xpx: xpx, ypx: ypx }, 'xy');
            Lib.clearThrottle();
        }

        it('should display correct label content', function(done) {
            var gd = createGraphDiv();

            Plotly.plot(gd, [{
                type: 'heatmap',
                y: [0, 1],
                z: [[1, 2, 3], [2, 2, 1]],
                name: 'one',
            }, {
                type: 'heatmap',
                y: [2, 3],
                z: [[1, 2, 3], [2, 2, 1]],
                name: 'two'
            }], {
                width: 500,
                height: 400,
                margin: {l: 0, t: 0, r: 0, b: 0}
            })
            .then(function() {
                _hover(gd, 250, 100);
                assertHoverLabelContent({
                    nums: 'x: 1\ny: 3\nz: 2',
                    name: 'two'
                });
            })
            .then(function() {
                _hover(gd, 250, 300);
                assertHoverLabelContent({
                    nums: 'x: 1\ny: 1\nz: 2',
                    name: 'one'
                });
            })
            .catch(fail)
            .then(done);
        });
    });

    describe('hoverformat', function() {
        var data = [{
                x: [1, 2, 3],
                y: [0.12345, 0.23456, 0.34567]
            }],
            layout = {
                yaxis: { showticklabels: true, hoverformat: ',.2r' },
                width: 600,
                height: 400
            };

        beforeEach(function() {
            this.gd = createGraphDiv();
        });

        it('should display the correct format when ticklabels true', function() {
            Plotly.plot(this.gd, data, layout);
            mouseEvent('mousemove', 303, 213);

            assertHoverLabelContent({
                nums: '0.23',
                axis: '2'
            });
        });

        it('should display the correct format when ticklabels false', function() {
            layout.yaxis.showticklabels = false;
            Plotly.plot(this.gd, data, layout);
            mouseEvent('mousemove', 303, 213);

            assertHoverLabelContent({
                nums: '0.23',
                axis: '2'
            });
        });
    });

    describe('textmode', function() {
        var data = [{
                x: [1, 2, 3, 4],
                y: [2, 3, 4, 5],
                mode: 'text',
                hoverinfo: 'text',
                text: ['test', null, 42, undefined]
            }],
            layout = {
                width: 600,
                height: 400
            };

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), data, layout).then(done);
        });

        it('should show text labels', function() {
            mouseEvent('mousemove', 108, 303);
            assertHoverLabelContent({
                nums: 'test'
            });
        });

        it('should show number labels', function() {
            mouseEvent('mousemove', 363, 173);
            assertHoverLabelContent({
                nums: '42'
            });
        });

        it('should not show null text labels', function() {
            mouseEvent('mousemove', 229, 239);
            assertHoverLabelContent({});
        });

        it('should not show undefined text labels', function() {
            mouseEvent('mousemove', 493, 108);
            assertHoverLabelContent({});
        });
    });

    describe('hover events', function() {
        var data = [{x: [1, 2, 3], y: [1, 3, 2], type: 'bar'}];
        var layout = {width: 600, height: 400};
        var gd;

        beforeEach(function(done) {
            gd = createGraphDiv();
            Plotly.plot(gd, data, layout).then(done);
        });

        it('should skip the hover event if explicitly instructed', function(done) {
            var hoverHandler = jasmine.createSpy();
            gd.on('plotly_hover', hoverHandler);

            var gdBB = gd.getBoundingClientRect();
            var event = {clientX: gdBB.left + 300, clientY: gdBB.top + 200};

            Promise.resolve().then(function() {
                Fx.hover(gd, event, 'xy', true);
            })
            .then(function() {
                expect(hoverHandler).not.toHaveBeenCalled();
            })
            .catch(fail)
            .then(done);
        });

        it('should emit events only if the event looks user-driven', function(done) {
            var hoverHandler = jasmine.createSpy();
            gd.on('plotly_hover', hoverHandler);

            var gdBB = gd.getBoundingClientRect();
            var event = {clientX: gdBB.left + 300, clientY: gdBB.top + 200};

            Promise.resolve().then(function() {
                Fx.hover(gd, event, 'xy');
            })
            .then(delay(HOVERMINTIME * 1.1))
            .then(function() {
                Fx.unhover(gd);
            })
            .then(function() {
                expect(hoverHandler).not.toHaveBeenCalled();
                var dragger = gd.querySelector('.nsewdrag');

                Fx.hover(gd, Lib.extendFlat({target: dragger}, event), 'xy');
            })
            .then(function() {
                expect(hoverHandler).toHaveBeenCalledTimes(1);
            })
            .catch(fail)
            .then(done);
        });
    });
});

describe('hover info on stacked subplots', function() {
    'use strict';

    afterEach(destroyGraphDiv);

    describe('hover info on stacked subplots with shared x-axis', function() {
        var mock = require('@mocks/stacked_coupled_subplots.json');

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mock.data, mock.layout).then(done);
        });

        it('responds to hover', function() {
            var gd = document.getElementById('graph');
            Plotly.Fx.hover(gd, {xval: 3}, ['xy', 'xy2', 'xy3']);

            expect(gd._hoverdata.length).toEqual(2);

            expect(gd._hoverdata[0]).toEqual(jasmine.objectContaining(
                {
                    curveNumber: 1,
                    pointNumber: 1,
                    x: 3,
                    y: 110
                }));

            expect(gd._hoverdata[1]).toEqual(jasmine.objectContaining(
                {
                    curveNumber: 2,
                    pointNumber: 0,
                    x: 3,
                    y: 1000
                }));

            assertHoverLabelContent({
                // There should be 2 pts being hovered over,
                // in two different traces, one in each plot.
                nums: ['110', '1000'],
                name: ['trace 1', 'trace 2'],
                // There should be a single label on the x-axis with the shared x value, 3'
                axis: '3'
            });
        });
    });

    describe('hover info on stacked subplots with shared y-axis', function() {
        var mock = Lib.extendDeep(require('@mocks/stacked_subplots_shared_yaxis.json'));
        mock.data[0].name = 'Who put the bomp in the bomp bah bomp bah bomp';
        mock.data[0].hoverlabel = {namelength: -1};
        mock.data[1].name = 'Who put the ram in the rama lama ding dong';
        mock.data[1].hoverlabel = {namelength: [2, 4]};
        mock.data[2].name = 'Who put the bop in the bop shoo bop shoo bop';
        mock.layout.hoverlabel = {namelength: 10};

        beforeEach(function(done) {
            Plotly.plot(createGraphDiv(), mock.data, mock.layout).then(done);
        });

        it('responds to hover', function() {
            var gd = document.getElementById('graph');
            Plotly.Fx.hover(gd, {yval: 0}, ['xy', 'x2y', 'x3y']);

            expect(gd._hoverdata.length).toEqual(3);

            expect(gd._hoverdata[0]).toEqual(jasmine.objectContaining(
                {
                    curveNumber: 0,
                    pointNumber: 0,
                    x: 1,
                    y: 0
                }));

            expect(gd._hoverdata[1]).toEqual(jasmine.objectContaining(
                {
                    curveNumber: 1,
                    pointNumber: 0,
                    x: 2.1,
                    y: 0
                }));

            expect(gd._hoverdata[2]).toEqual(jasmine.objectContaining(
                {
                    curveNumber: 2,
                    pointNumber: 0,
                    x: 3,
                    y: 0
                }));


            assertHoverLabelContent({
                // There should be three points being hovered over, in three different traces,
                // one in each plot.
                nums: ['1', '2.1', '3'],
                name: ['Who put the bomp in the bomp bah bomp bah bomp', 'Wh', 'Who put...'],
                // There should be a single label on the y-axis with the shared y value, 0.
                axis: '0'
            });
        });
    });
});


describe('hover info on overlaid subplots', function() {
    'use strict';

    afterEach(destroyGraphDiv);

    it('should respond to hover', function(done) {
        var mock = require('@mocks/autorange-tozero-rangemode.json');

        Plotly.plot(createGraphDiv(), mock.data, mock.layout).then(function() {
            mouseEvent('mousemove', 768, 345);

            assertHoverLabelContent({
                nums: ['0.35', '2,352.5'],
                name: ['Take Rate', 'Revenue'],
                axis: '1'
            });
        })
        .then(done);
    });
});

describe('hover after resizing', function() {

    var gd;
    afterEach(destroyGraphDiv);

    function _click(pos) {
        return new Promise(function(resolve) {
            click(pos[0], pos[1]);

            setTimeout(function() {
                resolve();
            }, HOVERMINTIME);
        });
    }

    function check(pos, expectation, msg) {
        Lib.clearThrottle();
        mouseEvent('mousemove', pos[0], pos[1]);
        assertHoverLabelContent({
            nums: expectation[0],
            name: expectation[1],
            axis: expectation[2]
        }, msg);
    }

    it('should work', function(done) {
        gd = createGraphDiv();

        var data = [{ y: [2, 1, 2] }];
        var layout = { width: 600, height: 500 };

        var pos0 = [305, 403];
        var pos1 = [401, 122];

        Plotly.plot(gd, data, layout).then(function() {
            // to test https://github.com/plotly/plotly.js/issues/1044
            return _click(pos0);
        })
        .then(function() {
            return check(pos0, ['1', null, '1'], 'before resize, showing pt label');
        })
        .then(function() {
            return check(pos1, [null, null, null], 'before resize, not showing blank spot');
        })
        .then(function() {
            return Plotly.relayout(gd, 'width', 500);
        })
        .then(function() {
            return check(pos0, [null, null, null], 'after resize, not showing blank spot');
        })
        .then(function() {
            return check(pos1, ['2', null, '2'], 'after resize, showing pt label');
        })
        .then(function() {
            return Plotly.relayout(gd, 'width', 600);
        })
        .then(function() {
            return check(pos0, ['1', null, '1'], 'back to initial, showing pt label');
        })
        .then(function() {
            return check(pos1, [null, null, null], 'back to initial, not showing blank spot');
        })
        .then(done);
    });
});

describe('hover on fill', function() {
    'use strict';

    afterEach(destroyGraphDiv);

    function assertLabelsCorrect(mousePos, labelPos, labelText) {
        return new Promise(function(resolve) {
            mouseEvent('mousemove', mousePos[0], mousePos[1]);

            setTimeout(function() {
                var hoverText = d3.selectAll('g.hovertext');
                expect(hoverText.size()).toEqual(1);
                expect(hoverText.text()).toEqual(labelText);

                var transformParts = hoverText.attr('transform').split('(');
                expect(transformParts[0]).toEqual('translate');
                var transformCoords = transformParts[1].split(')')[0].split(',');
                expect(+transformCoords[0]).toBeCloseTo(labelPos[0], -1.2, labelText + ':x');
                expect(+transformCoords[1]).toBeCloseTo(labelPos[1], -1.2, labelText + ':y');

                resolve();
            }, HOVERMINTIME);
        });
    }

    it('should always show one label in the right place', function(done) {
        var mock = Lib.extendDeep({}, require('@mocks/scatter_fill_self_next.json'));
        mock.data.forEach(function(trace) { trace.hoveron = 'fills'; });

        Plotly.plot(createGraphDiv(), mock.data, mock.layout).then(function() {
            return assertLabelsCorrect([242, 142], [252, 133.8], 'trace 2');
        }).then(function() {
            return assertLabelsCorrect([242, 292], [233, 210], 'trace 1');
        }).then(function() {
            return assertLabelsCorrect([147, 252], [158.925, 248.1], 'trace 0');
        }).then(done);
    });

    it('should work for scatterternary too', function(done) {
        var mock = Lib.extendDeep({}, require('@mocks/ternary_fill.json'));
        var gd = createGraphDiv();

        Plotly.plot(gd, mock.data, mock.layout).then(function() {
            // hover over a point when that's closest, even if you're over
            // a fill, because by default we have hoveron='points+fills'
            return assertLabelsCorrect([237, 150], [240.0, 144],
                'trace 2Component A: 0.8Component B: 0.1Component C: 0.1');
        }).then(function() {
            // the rest are hovers over fills
            return assertLabelsCorrect([237, 170], [247.7, 166], 'trace 2');
        }).then(function() {
            return assertLabelsCorrect([237, 218], [266.75, 265], 'trace 1');
        }).then(function() {
            return assertLabelsCorrect([237, 240], [247.7, 254], 'trace 0');
        }).then(function() {
            // zoom in to test clipping of large out-of-viewport shapes
            return Plotly.relayout(gd, {
                'ternary.aaxis.min': 0.5,
                'ternary.baxis.min': 0.25
            });
        }).then(function() {
            // this particular one has a hover label disconnected from the shape itself
            // so if we ever fix this, the test will have to be fixed too.
            return assertLabelsCorrect([295, 218], [275.1, 166], 'trace 2');
        }).then(function() {
            // trigger an autoscale redraw, which goes through dragElement
            return doubleClick(237, 251);
        }).then(function() {
            // then make sure we can still select a *different* item afterward
            return assertLabelsCorrect([237, 218], [266.75, 265], 'trace 1');
        }).then(done);
    });
});

describe('hover updates', function() {
    'use strict';

    afterEach(destroyGraphDiv);

    function assertLabelsCorrect(mousePos, labelPos, labelText) {
        return new Promise(function(resolve) {
            if(mousePos) {
                mouseEvent('mousemove', mousePos[0], mousePos[1]);
            }

            setTimeout(function() {
                var hoverText = d3.selectAll('g.hovertext');
                if(labelPos) {
                    expect(hoverText.size()).toEqual(1);
                    expect(hoverText.text()).toEqual(labelText);

                    var transformParts = hoverText.attr('transform').split('(');
                    expect(transformParts[0]).toEqual('translate');
                    var transformCoords = transformParts[1].split(')')[0].split(',');
                    expect(+transformCoords[0]).toBeCloseTo(labelPos[0], -1, labelText + ':x');
                    expect(+transformCoords[1]).toBeCloseTo(labelPos[1], -1, labelText + ':y');
                } else {
                    expect(hoverText.size()).toEqual(0);
                }

                resolve();
            }, HOVERMINTIME);
        });
    }

    it('should update the labels on animation', function(done) {
        var mock = {
            data: [
                {x: [0.5], y: [0.5], showlegend: false},
                {x: [0], y: [0], showlegend: false},
            ],
            layout: {
                margin: {t: 0, r: 0, b: 0, l: 0},
                width: 200,
                height: 200,
                xaxis: {range: [0, 1]},
                yaxis: {range: [0, 1]},
            }
        };

        var gd = createGraphDiv();
        Plotly.plot(gd, mock).then(function() {
            // The label text gets concatenated together when queried. Such is life.
            return assertLabelsCorrect([100, 100], [103, 100], 'trace 00.5');
        }).then(function() {
            return Plotly.animate(gd, [{
                data: [{x: [0], y: [0]}, {x: [0.5], y: [0.5]}],
                traces: [0, 1],
            }], {frame: {redraw: false, duration: 0}});
        }).then(function() {
            // No mouse event this time. Just change the data and check the label.
            // Ditto on concatenation. This is "trace 1" + "0.5"
            return assertLabelsCorrect(null, [103, 100], 'trace 10.5');
        }).then(function() {
            // Restyle to move the point out of the window:
            return Plotly.relayout(gd, {'xaxis.range': [2, 3]});
        }).then(function() {
            // Assert label removed:
            return assertLabelsCorrect(null, null);
        }).then(function() {
            // Move back to the original xaxis range:
            return Plotly.relayout(gd, {'xaxis.range': [0, 1]});
        }).then(function() {
            // Assert label restored:
            return assertLabelsCorrect(null, [103, 100], 'trace 10.5');
        }).catch(fail).then(done);
    });

    it('should not trigger infinite loop of plotly_unhover events', function(done) {
        var gd = createGraphDiv();
        var colors0 = ['#00000', '#00000', '#00000', '#00000', '#00000', '#00000', '#00000'];

        function unhover() {
            return new Promise(function(resolve) {
                mouseEvent('mousemove', 394, 285);
                setTimeout(function() {
                    resolve();
                }, HOVERMINTIME);
            });
        }

        var hoverCnt = 0;
        var unHoverCnt = 0;

        Plotly.plot(gd, [{
            mode: 'markers',
            x: [1, 2, 3, 4, 5, 6, 7],
            y: [1, 2, 3, 2, 3, 4, 3],
            marker: {
                size: 16,
                colors: colors0.slice()
            }
        }])
        .then(function() {

            gd.on('plotly_hover', function(eventData) {
                hoverCnt++;

                var pt = eventData.points[0];
                Plotly.restyle(gd, 'marker.color[' + pt.pointNumber + ']', 'red');
            });

            gd.on('plotly_unhover', function() {
                unHoverCnt++;

                Plotly.restyle(gd, 'marker.color', [colors0.slice()]);
            });

            return assertLabelsCorrect([351, 251], [358, 272], '2');
        })
        .then(unhover)
        .then(function() {
            expect(hoverCnt).toEqual(1);
            expect(unHoverCnt).toEqual(1);

            return assertLabelsCorrect([400, 200], [435, 198], '3');
        })
        .then(unhover)
        .then(function() {
            expect(hoverCnt).toEqual(2);
            expect(unHoverCnt).toEqual(2);
        })
        .then(done);

    });
});

describe('Test hover label custom styling:', function() {
    afterEach(destroyGraphDiv);

    function assertLabel(className, expectation) {
        var g = d3.select('g.' + className);

        if(expectation === null) {
            expect(g.size()).toBe(0);
        } else {
            assertHoverLabelStyle(g, {
                bgcolor: expectation.path[0],
                bordercolor: expectation.path[1],
                fontSize: expectation.text[0],
                fontFamily: expectation.text[1],
                fontColor: expectation.text[2]
            },
            '',
            {hovertext: 'text.nums', axistext: 'text'}[className]);
        }
    }

    function assertPtLabel(expectation) {
        assertLabel('hovertext', expectation);
    }

    function assertCommonLabel(expectation) {
        assertLabel('axistext', expectation);
    }

    function _hover(gd, opts) {
        Fx.hover(gd, opts);
        Lib.clearThrottle();
    }

    it('should work for x/y cartesian traces', function(done) {
        var gd = createGraphDiv();

        Plotly.plot(gd, [{
            x: [1, 2, 3],
            y: [1, 2, 1],
            marker: {
                color: ['yellow', 'black', 'cyan']
            },
            hoverlabel: {
                font: {
                    color: ['red', 'green', 'blue'],
                    size: 20
                }
            }
        }], {
            hovermode: 'x',
            hoverlabel: { bgcolor: 'white' }
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[0] });

            assertPtLabel({
                path: ['rgb(255, 255, 255)', 'rgb(68, 68, 68)'],
                text: [20, 'Arial', 'rgb(255, 0, 0)']
            });
            assertCommonLabel({
                path: ['rgb(255, 255, 255)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[1] });

            assertPtLabel({
                path: ['rgb(255, 255, 255)', 'rgb(68, 68, 68)'],
                text: [20, 'Arial', 'rgb(0, 128, 0)']
            });
            assertCommonLabel({
                path: ['rgb(255, 255, 255)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[2] });

            assertPtLabel({
                path: ['rgb(255, 255, 255)', 'rgb(68, 68, 68)'],
                text: [20, 'Arial', 'rgb(0, 0, 255)']
            });
            assertCommonLabel({
                path: ['rgb(255, 255, 255)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });

            // test arrayOk case
            return Plotly.restyle(gd, 'hoverinfo', [['skip', 'name', 'x']]);
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[0] });

            assertPtLabel(null);
            assertCommonLabel(null);
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[1] });

            assertPtLabel({
                path: ['rgb(255, 255, 255)', 'rgb(68, 68, 68)'],
                text: [20, 'Arial', 'rgb(0, 128, 0)']
            });
            assertCommonLabel(null);
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[2] });

            assertPtLabel(null);
            assertCommonLabel({
                path: ['rgb(255, 255, 255)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });

            // test base case
            return Plotly.update(gd, {
                hoverlabel: null,
                // all these items should be display as 'all'
                hoverinfo: [['i+dont+what+im+doing', null, undefined]]
            }, {
                hoverlabel: null
            });
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[0] });

            assertPtLabel({
                path: ['rgb(255, 255, 0)', 'rgb(68, 68, 68)'],
                text: [13, 'Arial', 'rgb(68, 68, 68)']
            });
            assertCommonLabel({
                path: ['rgb(68, 68, 68)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[1] });

            assertPtLabel({
                path: ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
            assertCommonLabel({
                path: ['rgb(68, 68, 68)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[2] });

            assertPtLabel({
                path: ['rgb(0, 255, 255)', 'rgb(68, 68, 68)'],
                text: [13, 'Arial', 'rgb(68, 68, 68)']
            });
            assertCommonLabel({
                path: ['rgb(68, 68, 68)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });

            // test insufficient arrayOk case
            return Plotly.restyle(gd, 'hoverinfo', [['none']]);
        })
        .then(function() {
            expect(gd.calcdata[0].map(function(o) { return o.hi; })).toEqual(
                ['none', 'x+y+z+text', 'x+y+z+text'],
                'should fill calcdata item with correct default'
            );

            _hover(gd, { xval: gd._fullData[0].x[0] });

            assertPtLabel(null);
            assertCommonLabel(null);
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[1] });

            assertPtLabel({
                path: ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
            assertCommonLabel({
                path: ['rgb(68, 68, 68)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
        })
        .then(function() {
            _hover(gd, { xval: gd._fullData[0].x[2] });

            assertPtLabel({
                path: ['rgb(0, 255, 255)', 'rgb(68, 68, 68)'],
                text: [13, 'Arial', 'rgb(68, 68, 68)']
            });
            assertCommonLabel({
                path: ['rgb(68, 68, 68)', 'rgb(255, 255, 255)'],
                text: [13, 'Arial', 'rgb(255, 255, 255)']
            });
        })
        .catch(fail)
        .then(done);
    });

    it('should work for 2d z cartesian traces', function(done) {
        var gd = createGraphDiv();

        Plotly.plot(gd, [{
            type: 'heatmap',
            x: [1, 2],
            y: [1, 2],
            z: [[1, 2], [2, 3]],
            hoverlabel: {
                font: {
                    color: 'red',
                    size: [[10, 20], [21, 11]]
                }
            }
        }], {
            hoverlabel: {
                bordercolor: 'blue',
                font: { family: 'Gravitas'}
            }
        })
        .then(function() {
            _hover(gd, { xval: 1, yval: 1 });

            assertPtLabel({
                path: ['rgb(68, 68, 68)', 'rgb(0, 0, 255)'],
                text: [10, 'Gravitas', 'rgb(255, 0, 0)']
            });
        })
        .then(function() {
            _hover(gd, { xval: 2, yval: 1 });

            assertPtLabel({
                path: ['rgb(68, 68, 68)', 'rgb(0, 0, 255)'],
                text: [20, 'Gravitas', 'rgb(255, 0, 0)']
            });
        })
        .then(function() {
            _hover(gd, { xval: 1, yval: 2 });

            assertPtLabel({
                path: ['rgb(68, 68, 68)', 'rgb(0, 0, 255)'],
                text: [21, 'Gravitas', 'rgb(255, 0, 0)']
            });
        })
        .then(function() {
            _hover(gd, { xval: 2, yval: 2 });

            assertPtLabel({
                path: ['rgb(68, 68, 68)', 'rgb(0, 0, 255)'],
                text: [11, 'Gravitas', 'rgb(255, 0, 0)']
            });
        })
        .catch(fail)
        .then(done);
    });
});

describe('ohlc hover interactions', function() {
    var data = [{
        type: 'candlestick',
        x: ['2011-01-01', '2012-01-01'],
        open: [2, 2],
        high: [3, 3],
        low: [0, 0],
        close: [3, 3],
    }];

    beforeEach(function() {
        this.gd = createGraphDiv();
    });

    afterEach(destroyGraphDiv);

    // See: https://github.com/plotly/plotly.js/issues/1807
    it('should not fail in appendArrayPointValue', function() {
        Plotly.plot(this.gd, data);
        mouseEvent('mousemove', 203, 213);

        expect(d3.select('.hovertext').size()).toBe(1);
    });
});
