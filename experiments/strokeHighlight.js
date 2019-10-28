//Sketch Annotation tool
jsPsych.plugins['part_annotation'] = (function () {
    //totalBonus variable to carry-over bonus amount between trials
    var totalBonus = 0;
    var plugin = {};
    //intializing drag state checker and array of selected array
    var dragStat = false;
    //initializing array of selected strokes as empty
    var colorChecked = false;
    plugin.info = {
        name: 'part_annotation',
        parameters: {
        }
    }
    plugin.trial = function (display_element, trial) {
        //More initializations
        var curIndex = 0;
        var dict = [];
        var results = [];
        var timeClicked;
        var totalSplines;
        var Bonus = 0;
        var tempSketch = [];
        var sketch = [];
        var pathArray = new Array;
        var splineArray;
        var c = 0;
        var otherColor;
        var colNo = 0;
        var confettiCount = 200;
        var similarityThreshold = 0.9;
        var colorFlag = false;
        var splineArcLengthThreshold = 18;
        var maxSameColStrokes
        colorChecked = false;
        var partList;
        var curParent;
        var curParentLi;
        //Setting colors for the menu items ROYGBIV from left to right
        //Setting RGB values to interpolate between 
        var left = [237, 56, 8];
        var right = [56, 209, 237];

        //Putting function calls and HTML elements of the jsPsych display element within a 1 second timeout
        setTimeout(function () {
            //Setting up HTML for each trial
            display_element.innerHTML += ('\
      <a id="downloadAnchorElem" style="display:none"></a>\
      <div class ="wrapper"></div><p id= "bonusMeter" style="font-size:25px;text-align:left; float:left;">Bonus: $ '+ totalBonus.toFixed(3) + '</p>\
      <p id="trialNum"style="text-align:right; font-size:25px"> '+ (trial.trialNum + 1) + " of " + trial.num_trials + '</p><div id="main_container" style="width:1000px;height:600px; margin:auto;"> \
      <div id= "upper_container" style="margin:auto; width:800px">\
      <div style="float:right; padding-top:43px;left:0px"><div class="list-group" id="List" style="margin:auto; float:left; list-style-type: none;"></div>\
      <div style="float:left; padding-top:0px;left:0px"><ul id="InstCount" style="margin:auto;"></ul></div></div>\
      </div>\
      <div id="canvas_container" style="width:300px;display:absolute;margin:auto;">\
      <p id="Title" style="color:black;height:10%">'+ trial.category + '</p> \
      <canvas id="myCanvas" style="border: 2px solid #000000; border-radius:10px"  \
      resize="true" ></canvas> \
      <button id = "nextButton" type="button" style="float:bottom;height:10%">Next Sketch</button> \
      </div></div>\
      <div class="progress" style="float:bottom; margin-top:2px;margin-bottom:2px;"> \
      <div id= "progressbar" class="progress-bar" role="progressbar" \
      style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%\
      </div>\
      </div>\
      </div>\
      </div> \
      <div id="dialog-form" title="Enter Part Label">\
      <form>\
      <fieldset> \
      <label for="partName">Part Name</label>\
      <input type="text" name="partName" id="partName" \
      placeholder="Type your part label here" \
      class="text ui-widget-content ui-corner-all"> \
      <div id ="confirmContinue" title= "Move on to next sketch?">\
      Clicking continue will end the current round. \
      Please make sure you have labeled all the parts that you can. \
      Click back to continue labeling the sketch.\
      </div>\
      <input type="submit" tabindex="-1" style="position:absolute; top:-1000px">\
      </fieldset>\
      </form>\
      </div> \
      </div>\
      <div id= "colorCheck" title="Are you sure?">It looks like you used the same label for a lot of strokes! Why not take a second to check\
      your labeling just to be sure? Once you are done, click on the "next sketch" button again to continue</div>\
      <div id="labelAll" title = "Please label All Strokes"> It looks like you have not labeled all strokes, please double check'
            );

            paper.setup('myCanvas');
            partList = []
            _.forEach(Object.keys(trial.parts), function (part) {
                partList.push(part);
                _.forEach(trial.parts[part], function (sub_part) {
                    partList.push(sub_part);
                });
            });
            instCountArr = Array.apply(null, Array(partList.length + 2)).map(Number.prototype.valueOf, 0);
            multi_listgen();
            display();

        }, 1000);

        //Ending trial and creating trial data to be sent to db. Also resetting HTML elements
        var end_trial = function () {
            //Add un-labeled strokes to results
            var dataURL = document.getElementById('myCanvas').toDataURL();
            dataURL = dataURL.replace('data:image/png;base64,', '');
            var category = trial.category;

            _.forEach(_.range(curIndex, pathArray.length), function (index) {
                pushToDict(NaN, NaN);
            })

            var tempObj = {};
            tempObj[category] = dict;
            tempObj["png"] = dataURL;
            results.push(tempObj);
            results = JSON.stringify(results)

            //resetting canvas and menu elements
            project.activeLayer.removeChildren();
            paper.view.draw();


            //End Trial
            var time = Date.now();
            selectedArray = [];
            if (trial.training == false) {
                totalBonus = totalBonus + Bonus;
            }
            var turkInfo = jsPsych.turk.turkInfo();
            // gather the data to store for the trial
            var trial_data = _.extend({}, trial, {
                wID: turkInfo.workerId,
                hitID: turkInfo.hitId,
                aID: turkInfo.assignmentId,

                //TODO, change the db and collection name
                dbname: 'semantic_parts_v2',
                colname: 'graphical_conventions_run5',
                iterationName: 'testing',

                bonus: totalBonus,
                time: time,
                numSplines: totalSplines,
                condition: trial.condition,
                sameAnnotflag: colorFlag,
                numStrokes: trial.numStrokes,
                trialNum: trial.trialNum,
                originalGameID: trial.gameID,
                originalCondition: trial.condition,
                originalOutcome: trial.outcome,
                originalTrialNum: trial.originalTrialNum,
                originalResponse: trial.response,
                annotations: results
            });
            console.log("In End_trail, trial_data is: ", trial_data);
            // clear the display
            display_element.innerHTML = '';
            // move on to the next trial
            jsPsych.finishTrial(trial_data);
        };

        //Interpolating between the two values provided to generate colors for label menu
        function color_interpolate(left, right, colNo) {
            var components = [];
            for (var i = 0; i < 3; i++) {
                components[i] = Math.round(left[i] + (right[i] - left[i]) * colNo / (partList.length));
            }
            return ('"' + "rgb" + "(" + components[0] + "," + components[1] + "," + components[2] + ")" + '"');
        }

        //function for setting the color of the menu items
        function setColor(li) {
            li.css("background-color", color_interpolate(left, right, colNo));
            li.css("cursor", "pointer");
        };

        //function to create first-layer label
        function create_label(key) {
            var li;

            //If we know this first layer has children, give special id dropdown-btn-key
            if (((key in trial.parts)) && trial.parts[key].length != 0) {
                li = $("<a class='list-group-item list-group-item-action disabled' id = 'dropdown-btn-" + key + "'> <div>" + key + "</div></a>");
                setColor(li);
                li.appendTo("#List");

                var wrapper = $("<div class='dropdown-container' id = 'dropdown-container-" + key + "'></div>");
                wrapper.appendTo("#List");
                addParentClick(li);
            }
            else {
                li = $("<a class = 'list-group-item list-group-item-action' id = 'leaf-" + key + "'><div>" + key + "</div></a>");
                setColor(li);
                li.appendTo("#List");
                addLeafClick(li);
            }
        }

        function create_sub_label(key, sub_part) {
            var li = $("<a class = 'list-group-item list-group-item-action' id = 'leaf-" + sub_part + "'><div>" + sub_part + "</div></a>");
            setColor(li);
            li.appendTo("#dropdown-container-" + key);
            addLeafClick(li);
        }
        /* toggle the children dropdown of li, if it has any */
        function toggle(li) {
            if (li != undefined) {
                //toggle the dropdown 
                var dropdownContent = li.next();
                var display = dropdownContent.css("display");
                if (display === "block") {
                    dropdownContent.css("display", "none");
                } else {
                    dropdownContent.css("display", "block");
                }
            }
            else {
                console.log("has no drop down menu");
            }
        }

        function progressBar() {
            c++;
            //Progress marker updates and checking for whether confetti should fall
            if (c == pathArray.length) {
                if (trial.training == false) {
                    totalBonus = totalBonus + 0.02;
                }
                for (var i = 0; i < confettiCount; i++) {
                    create(i);
                }
            }

            $(".progress-bar").css("width", (c / pathArray.length) * 100 + '%');
            $(".progress-bar").attr('aria-valuenow', (c / pathArray.length) * 100);
            $('.progress-bar').html(c + " out of " + pathArray.length + ' labeled');
        }

        // Parent click listener
        function addParentClick(li) {
            li.click(function (event, ui) {
                //if we are clicking on the same parent
                if (curParent == li.attr('id').split("-").pop()) {
                    //clear the curParent and curParentLi
                    curParent = undefined;
                    curParentLi = undefined;
                }
                else {
                    curParent = li.attr('id').split("-").pop();
                    curParentLi = li;
                    opened = true;
                }
                //toogle the next level
                toggle(li);
            });
        }

        /* click behaviors on leaf level click */
        function addLeafClick(li) {

            li.click(function () {
                /* click on parts */
                if (li.attr('id').split("-").pop() != "Other") {
                    //If user is not clicking under the same parent
                    if (curParentLi != undefined && li.parent().prev().text() != curParentLi.text()) {
                        toggle(curParentLi);
                        //Re-initialize parent level
                        curParent = undefined;
                        curParentLi = undefined;
                    }

                    var label;
                    if (curParent != undefined) {
                        label = curParent + '-' + li.attr('id').split("-").pop();
                    }
                    else {
                        label = li.attr('id').split("-").pop();
                    }

                    // update the paper.js sketches and push to dict
                    pushToDict(label, li.css("background-color"));
                    // progress bar update
                    progressBar();
                }
                //Calling free entry box
                else {
                    otherColor = li.css("background-color");
                    $("#dialog-form").dialog("open");
                }
                if (curIndex < pathArray.length){
                    highlightNextStroke();
                }
            });

            comfirmDialog();
            free_response();

            $("#colorCheck").dialog({
                autoOpen: false,
                height: 400,
                width: 350,
                modal: true,
                open: function (event, ui) {
                    originalContent = $("#colorCheck").html();
                },
                buttons: {
                    "Ok": function () {
                        colorChecked = true;
                        $(this).dialog("close");
                        ;
                    },
                }
            });
        }

        //Behavior of clicking the next button, end_trail got called
        function nextButton_callBack() {
            console.log("next button clicked!");
            if (curIndex == pathArray.length && sameColorCheck(pathArray) == false) {
                end_trial();

                //Opening a confirmation box if all strokes haven't been labeled
            } else if (c == pathArray.length) {
                console.log("asd");
                colorFlag = true;
                $("#colorCheck").dialog("open");

            } else if (c < pathArray.length) {
                $('#confirmContinue').dialog("open")
            }
        }

        //Checking to make sure too many stokes have not been annotated with the same label
        function sameColorCheck() {
            if (colorChecked == true) {
                return (false);
            }
            var sameColStrokesArr = [];
            for (var i = 0; i < dict.length; i++) {
                var sameColStrokes = 1;
                // console.log(dict.length,dict[i].label,dict[0].label);
                _.forEach(dict, function (p) {
                    if (p.label == dict[i].label) {
                        sameColStrokes++;
                    }
                })
                sameColStrokesArr[i] = sameColStrokes;
            }
            maxSameColStrokes = Math.max.apply(Math, sameColStrokesArr);

            if (maxSameColStrokes / dict.length >= similarityThreshold) {
                return (true);
            } else { return (false); }
        }

        // Click and Hover event
        function highlightNextStroke() {
            //reset the current stroke color
            pathArray[curIndex].strokeColor = "rgb(0,255,0)";
        }

        //------Main Display function for Canvas events------//
        function display() {
            //Hiding bonusmeter and progress marker if its the training trial
            if (trial.training == true) {
                $("#bonusMeter").text('');
                $("#trialNum").text('');
            }

            //Creating the 'next sketch' button
            $("#nextButton").click(nextButton_callBack);

            //----------Displaying the sketch and setting stroke properties--------//
            var svg = trial.svg;
            var numPaths = 0;
            for (var k = 0; k < svg.length; k++) {
                //converting data to absolute coordinates
                splineArray = Snap.path.toCubic(Snap.path.toAbsolute(svg[k]));
                var copy = Snap.path.toCubic(Snap.path.toAbsolute(svg[k]));

                //formatting spline data to be able to create paper js paths from them
                var numSplines = 0;
                for (i = 0; i < splineArray.length; i++) {
                    if (splineArray[i][0] == 'M' && splineArray[i + 1][0] != 'M') {
                        tempSketch[numSplines] = (splineArray[i].concat(splineArray[i + 1]));
                        numSplines++;
                        i++;
                    } else if (splineArray[i][0] == 'M' && splineArray[i + 1][0] == 'M') {
                        tempSketch[numSplines] = splineArray[i];
                        numSplines++
                    }
                    else if (splineArray[i][0] == 'C') {
                        splineArray[i].unshift("M", copy[i - 1][5], copy[i - 1][6]);
                        tempSketch[numSplines] = splineArray[i];
                        numSplines++;
                    }
                }

                //Stringifying path data
                var numSplines = 0;
                _.forEach(tempSketch, function (f) {
                    sketch[numSplines] = f.toString();
                    numSplines++
                })

                //Actually displaying the sketch
                tempPath = new Array;
                for (var i = 0; i < sketch.length; i++) {
                    tempPath[i] = new Path(sketch[i]);
                }

                //Checking splines pairwise within strokes to concatenate small splines
                var j = tempPath.length - 1;
                while (j > 0) {
                    if (tempPath[j].length < splineArcLengthThreshold || tempPath[j - 1].length < splineArcLengthThreshold) {
                        tempPath[j] = tempPath[j - 1].join(tempPath[j]);
                        tempPath.splice(j, 1);
                    }
                    j--;
                }

                //Setting properties for the splines
                for (var i = numPaths; i < (tempPath.length + numPaths); i++) {
                    pathArray[i] = tempPath[i - numPaths];
                    pathArray[i].strokeColor = "rgb(0,0,0)";
                    pathArray[i].strokeWidth = 5;
                    pathArray[i].masterStrokeNum = k; //Stroke Num
                    //already clicked tracks if a stroke has been labeled
                    pathArray[i].alreadyClicked = false;
                    //highlit tracks whether a stroke is ready to be labeled
                    pathArray[i].highlit = false;
                    pathArray[i].strokeNum = i; //spline Num
                    pathArray[i].withinStrokeSplineNum = i - numPaths; //Spline index within stroke
                };

                numPaths = numPaths + tempPath.length;
                tempSketch = [];
                sketch = [];
            }
            totalSplines = numPaths;
            highlightNextStroke();
        }

        //Generating the list of par labels 
        function multi_listgen() {
            colNo = 0;
            //instCountInd = 0;

            $("#List").empty();
            //$("#InstCount").empty();

            var keys = Object.keys(trial.parts);
            _.forEach(keys, function (key) {
                colNo++;
                create_label(key);

                //Add sub_parts
                _.forEach(trial.parts[key], function (sub_part) {
                    create_sub_label(key, sub_part);
                });
            });

            var extra_labels = ["I cannot tell", "Other"];
            _.forEach(extra_labels, function (key) {
                colNo++;
                create_label(key);
            });
        }

        /* Do we want every user label everything? */
        function comfirmDialog() {
            //dialog form for checking if the participant really wants to progress when all strokes not labeled
            $("#confirmContinue").dialog({
                autoOpen: false,
                height: 400,
                width: 350,
                modal: true,
                buttons: {
                    "Back": function () {
                        $("#confirmContinue").dialog("close");
                    },
                    "Continue": function () {

                        end_trial();
                    }
                }
            });
        }

        function free_response() {
            //Free response dialog box 
            $("#dialog-form").dialog({
                autoOpen: false,
                height: 400,
                width: 350,
                modal: true,
                open: function (event, ui) {
                    originalContent = $("#dialog-form").html();
                },
                close: function (event, ui) {
                    $("#dialog-form").html(originalContent);
                },
                buttons:
                {
                    "Back": function () {
                        $("#dialog-form").dialog("close");
                    },

                    Submit: function () {
                        var UI = $("#partName").val();
                        if (UI == "") {
                            UI = "unknown";
                        }
                        pushToDict(UI, otherColor);
                        // progress bar update
                        progressBar();

                        $(this).dialog("close");
                    }
                }
            });
        }

        function pushToDict(label, color) {
            if (curIndex == pathArray.length) {
                alert("You have labelled all strokes! Please click Next Sketch button");
                return;
            }
            p = pathArray[curIndex];
            console.log(p);
            //Set color to background color
            p.strokeColor = color;

            if (curParent != undefined) {
                label = curParent + "-" + label;
            }

            console.log("In push to Dict, label is: ", label);
            svgstring = p.exportSVG({ asString: true });
            var start = svgstring.indexOf('d="') + 3;
            numLitStrokes = 0;
            dict.push({
                //IF HAOLIANG WHANTS MORE FEATURES FOR HIS MODEL, ADD MORE HERE
                "svgString": svgstring.substring(start, svgstring.indexOf('"', start)),
                "label": label,
                "strokeColor": p.strokeColor,
                "timeClicked": timeClicked,
                "timeLabeled": Date.now(),
                "cumulativeSplineNum": p.strokeNum
            });
            p.strokeWidth = 5;
            curIndex++;
        }


        //Confetti creator for when all strokes are labeled
        function create(i) {
            var width = Math.random() * 8;
            var height = width * 0.4;
            var colourIdx = Math.ceil(Math.random() * 3);
            var colour = "red";
            switch (colourIdx) {
                case 1:
                    colour = "yellow";
                    break;
                case 2:
                    colour = "blue";
                    break;
                default:
                    colour = "red";
            }
            $('<div style="position:fixed" class="confetti-' + i + ' ' + colour + '"></div>').css({
                "width": width + "px",
                "height": height + "px",
                "top": -Math.random() * 20 + "%",
                "left": Math.random() * 100 + "%",
                "opacity": Math.random() + 0.5,
                "transform": "rotate(" + Math.random() * 360 + "deg)"
            }).appendTo('.wrapper');
            drop(i);
        }
        //Dropping created confetti
        function drop(x) {
            $('.confetti-' + x).animate({
                top: "100%",
                left: "+=" + Math.random() * 15 + "%"
            }, Math.random() * 3000 + 3000, function () {
                //reset(x);
            });
        }
    }
    return plugin;
})();