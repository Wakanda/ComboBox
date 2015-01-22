(function(ComboBox) {
    "use strict";

    ComboBox.setWidth('200');
    ComboBox.setHeight('25');

    ComboBox.addLabel();

    ComboBox.customizeProperty('synchronized', {
        title: 'Synchronize',
        description: 'Synchronize with Choices'
    });
    ComboBox.customizeProperty('autoComplete', {
        title: 'Autocomplete'
    });
    ComboBox.customizeProperty('searchCriteria', {
        title: 'Filter'
    });

    ComboBox.doAfter('init', function() {

        // synchrinized
        function _synchronizedHandler() {
            if(this.synchronized()) {
                this.value.hide();
                this.value.old = this.value();
                this.value(null);
            } else {
                this.value.show();
                this.value(this.value.old);
            }
        }
        this.synchronized.onChange(_synchronizedHandler.bind(this));
        _synchronizedHandler.call(this);

        // autocomplete
        function _autoCompleteHandler() {
            if(this.autoComplete()) {
                this.searchCriteria.show();
                this.searchCriteria(this.searchCriteria.old);
            } else {
                this.searchCriteria.hide();
                this.searchCriteria.old = this.searchCriteria();
                this.searchCriteria(null);
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
            $(input.node).width($(this.node).innerWidth() - $(button.node).width());
        }.bind(this), 0);
    }
    ComboBox.studioOnResize(_resizeInput);

    // add events
    ComboBox.addEvents([{
        'name': 'notFound',
        'description': 'Not Found',
        'category': 'Property Events'
    }, {
        'name': 'doublonFound',
        'description': 'Doublon Found',
        'category': 'Property Events'
    }, {
         'name': 'open',
        'description': 'List Opened',
        'category': 'Property Events'
    }, {
         'name': 'close',
        'description': 'List Closed',
        'category': 'Property Events'
    }]);
});
