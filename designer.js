(function(ComboBox) {
    "use strict";

    ComboBox.setWidth('200');
    ComboBox.setHeight('25');

    ComboBox.addStates(':hover', ':active', ':focus', ':disabled');

    ComboBox.addLabel();

    ComboBox.customizeProperty('synchronize', {
        title: 'Synchronize',
        description: 'Synchronize with Items'
    });
    ComboBox.customizeProperty('autoComplete', {
        title: 'Autocomplete',
        description: 'Display items based on text entered'
    });
    ComboBox.customizeProperty('filter', {
        title: 'Filter',
        description: 'Filter items in the list'
    });
    ComboBox.customizeProperty('placeholder', {
        title: 'Placeholder',
        description: 'Placeholder text'
    });
    ComboBox.customizeProperty('template', {
        title: 'Template',
        description: 'Template for the list'
    });
    ComboBox.customizeProperty('value', {
        title: 'Value',
        description: 'Selected value to save'
    });

    // add events
    ComboBox.addEvents([{
        'name': 'valueNotFound',
        'description': 'On Value Not Found',
        'category': 'Combo Box Events'
    }, {
        'name': 'duplicateFound',
        'description': 'On Duplicate Found',
        'category': 'Combo Box Events'
    }, {
         'name': 'openedList',
        'description': 'On Opened List',
        'category': 'Combo Box Events'
    }, {
         'name': 'closedList',
        'description': 'On Closed List',
        'category': 'Combo Box Events'
    }]);

    ComboBox.doAfter('init', function() {
        var input = this.getPart('input');
        var button = this.getPart('button');
        var that = this;

        // synchrinized
        function _synchronizedHandler() {
            if(this.synchronize()) {
                this.value.hide();
                this.value.old = this.value();
                this.value(null);
            } else {
                this.value.show();
                this.value(this.value.old);
            }
        }
        this.synchronize.onChange(_synchronizedHandler.bind(this));
        _synchronizedHandler.call(this);

        // hide filter attributes if no autocomplete
        function _autoCompleteHandler() {
            if(this.autoComplete()) {
                this.filter.show();
                this.filter(this.filter.old);
            } else {
                this.filter.hide();
                this.filter.old = this.filter();
                this.filter(null);
            }
        }


        //FIXME : hide filter until have 'contain' and 'end with' implemented in array datasource
        //this.autoComplete.onChange(_autoCompleteHandler.bind(this));
        //_autoCompleteHandler.call(this);
        this.filter.hide();

        // hide custom widgets parts configuration
        _hideAttributesForm.call(this);

        function _hideAttributesForm() {
            // hide TextInput configuration
            ['value', 'inputType', 'maxLength', 'placeholder', 'readOnly'].forEach(function(attribute) {
                input[attribute].hide();
            });

            // hide Button configuration
            ['plainText', 'title', 'url', 'actionSource'].forEach(function(attribute) {
                button[attribute].hide();
            });
        }
        var intervalId;
        intervalId = window.setInterval(function() {
            if($(button.node).width()) {
                _resizeInput.call(that);
                clearInterval(intervalId);
            }
        }, 100);
    });

    // fixe the bug not supproted css calc webkit in studio
    function _resizeInput() {
        var input = this.getPart('input');
        var button = this.getPart('button');
        $(input.node).width($(this.node).width() - button.node.offsetWidth);
    }
    ComboBox.studioOnResize(_resizeInput);
});
