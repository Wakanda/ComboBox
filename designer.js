(function(ComboBox) {
    "use strict";

    ComboBox.setWidth('200');
    ComboBox.setHeight('25');

    ComboBox.addLabel();

    ComboBox.customizeProperty('synchronize', {
        title: 'Synchronize',
        description: 'Synchronize with Choices'
    });
    ComboBox.customizeProperty('autoComplete', {
        title: 'Autocomplete'
    });
    ComboBox.customizeProperty('filter', {
        title: 'Filter'
    });

    ComboBox.doAfter('init', function() {

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

        // autocomplete
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
        this.autoComplete.onChange(_autoCompleteHandler.bind(this));
        _autoCompleteHandler.call(this);

        // hide custom widgets parts configuration
        _hideAttributesForm.call(this);

        function _hideAttributesForm() {
            var input = this.getPart('input');
            var button = this.getPart('button');

            // hide TextInput configuration
            ['value', 'inputType', 'maxLength', 'placeholder', 'readOnly'].forEach(function(attribute) {
                input[attribute].hide();
            });

            // hide Button configuration
            ['plainText', 'title', 'url', 'actionSource'].forEach(function(attribute) {
                button[attribute].hide();
            });
        }
        _resizeInput.call(this);
    });

    // fixe the bug not supproted css calc webkit in studio
    function _resizeInput() {
        window.setTimeout(function() {
            var input = this.getPart('input');
            var button = this.getPart('button');
            var buttonBorderWidth = parseInt($(button.node).css('border-left-width') || 0, 10) - parseInt($(button.node).css('border-right-width') || 0, 10);
            $(input.node).width($(this.node).width() - $(button.node).width() - buttonBorderWidth);
        }.bind(this), 0);
    }
    ComboBox.studioOnResize(_resizeInput);

    // add events
    ComboBox.addEvents([{
        'name': 'valueNotFound',
        'description': 'On Value Not Found',
        'category': 'Property Events'
    }, {
        'name': 'duplicateFound',
        'description': 'On Duplicate Found',
        'category': 'Property Events'
    }, {
         'name': 'openedList',
        'description': 'On Opened List',
        'category': 'Property Events'
    }, {
         'name': 'closedList',
        'description': 'On Closed List',
        'category': 'Property Events'
    }]);
});
