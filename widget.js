WAF.define('ComboBox', ['waf-core/widget', 'TextInput', 'Button', 'ListView'], function(widget, TextInput, Button, ListView) {
    "use strict";

    var ComboBox = widget.create('ComboBox', {
        tagName: 'div',
        value: widget.property(),
        synchronize: widget.property({
            type: 'boolean',
            bindable: false
        }),
        autoComplete: widget.property({
            type: 'boolean',
            bindable: false,
            defaultValue: true
        }),
        filter: widget.property({
            type: 'enum',
            values: {
                'startWith': 'starts with',
                'endWith': 'ends with',
                'contain': 'contains',
                'equal': 'equals'
            },
            defaultValue: '',
            bindable: false
        }),
        placeholder: widget.property({
            type: 'string',
            bindable: false
        }),
        template: widget.property({
            type: 'template',
            templates: [
                {
                    name: 'Text only',
                    template: '<li role="option" style="{{_style}}"  val={{value}}>\
                                            {{List}}\
                              </li>'
                },
                {
                    name: 'Image and text',
                    template: '<li role="option" style="{{_style}}"  val={{value}}>\
                                            <p>\
                                            <img  src="{{image}}" />\
                                            {{List}}\
                                            </p>\
                              </li>'
                }

            ],
            datasourceProperty: 'items'
        }),
        items: widget.property({
            type: 'datasource',
            attributes: [{
                name: 'value'
            }, {
                name: 'display'
            }],
            pageSize: 10
        }),
        init: function() {
            this._initInput();
            this._initButton();
            this._initList();
            this._changeCssClassName();

            var that = this;

            var initListDatasource = function() {
                var list = that.getPart('list');
                if(!this.items()) {
                    list.items(null);
                    return;
                }
                var collection = duplicateDataSource(that.items.boundDatasource(), that.id);

                list.items(collection);
                list.template(that.template());
                if(that.items.mapping()) {
                    list.items.setMapping(that.items.mapping());
                }

                //collection.subscribe('collectionChange', function(e) { console.warn('>>> collection change'); });
            };

            initListDatasource.call(that);
            this.subscribe('datasourceBindingChange', 'items', initListDatasource, this);

            this._syncItemsCollectionChange = this.items.subscribe('collectionChange',
                this._syncCollectionChangeHandler.bind(this),
            this);


            // update selected after bind value change
            this.value.onChange(function() {
                this._selectValueCombobox(this.value());
                this.closeList();
            });

            this._syncItemsElementChangeSubscriber = this.items.subscribe('currentElementChange', function(e) {
                if(this.synchronize()) {
                    this._setCollectionPosition();
                }
            }.bind(this), this);
        },
        _refreshInputDisplay: function() {
            var collection = this.getPart('list').items(),
                mapping = this._getItemsMapping();

            this.getPart('input').value(collection.getAttributeValue(mapping.display));
        },
        _setCollectionPosition: function() {
            var collection = this.getPart('list').items(),
                that = this,
                mapping = this._getItemsMapping();

            if(! collection) {
                return;
            }
            if(this.synchronize()) {
                if(this.items().length &&  collection.length) {
                    if(this.items().getPosition() !== collection.getPosition()) {
                        var options = {};
                        options.onSuccess = options.onError = function(e) {
                            that._refreshInputDisplay();
                        };
                        collection.select(this.items().getPosition(), options);
                    } else {
                        that._refreshInputDisplay();
                    }
                }
                // update value
                var value = this.items().getAttributeValue(mapping.value);
                this.value(value);
            }
        },
        _syncCollectionChangeHandler: function() {
            var collection = this.getPart('list').items(),
                that = this;
            if(! collection) {
                return;
            }
            this.items().filterQuery('', {
                destinationDataSource: collection._private.id,
                onSuccess: function() {
                    that._setCollectionPosition();
                }
            });
        },
        _changeCssClassName: function() {
            this.addClass('waf-combobox2');

           ['input', 'button', 'list'].forEach(function(name) {
                var widget = this.getPart(name);
                if(widget) {
                    $(widget.node).addClass('waf-combobox2-part-' + name);
                }
            }.bind(this));
        },
        _getItemsMapping: function() {
            var mapping = {};
            var boundDatasource = this.items.boundDatasource();

            if(this.items.mapping()) {
                mapping = this.items.mapping();

            } else if(boundDatasource && ! boundDatasource.datasourceName && boundDatasource.datasource._private.sourceType === 'array') {
                // in this case, the datasource is from static value cbx form configuration
                boundDatasource.datasource.getAttributeNames().forEach(function(att) { mapping[att] = att; });
            }

            return mapping;
        },
        _doSearch: function(value) {
            var collection = this.getPart('list').items(),
                items = this.items(),
                that = this,
                position,
                input = this.getPart('input');

            // search attribute
            var mapping = this._getItemsMapping();
            var searchAttribute = mapping.display;

            if(! collection || ! searchAttribute) {
                return;
            }

            var queryString = '';
            if(value) {
                queryString = searchAttribute + ' = :1';
                switch(this.filter()) {
                    case 'startWith':
                        value += '*';
                        break;
                    case 'endWith':
                        value = '*' + value;
                        break;
                    case 'contain':
                        value = '*' + value + '*';
                        break;
                    case 'equal':
                        break;
                    default:
                        value += '*';
                }
            }

            if(queryString === '') {
                position = Math.min(Math.max(collection.getPosition(), 0), collection.length -1);
            } else {
                position = 0;
            }

            var _selectPosition = function() {
                if(collection.getPosition() === position) {
                    if(! $(input.node).is(':focus')) {
                        $(input.node).focus();
                    }
                   that._openList();
                } else {
                    // open the list the display the selected element
                    that._openList();
                    collection.select(position, function() {
                        if(! $(input.node).is(':focus')) {
                            $(input.node).focus();
                        }
                    });
                }
            };

            items.filterQuery(queryString, {
                onSuccess: function(e) {
                    _selectPosition.call(that);
                },
                onError: function(e) {
                    console.error(e);
                },
                destinationDataSource: collection._private.id,
                params: [ value ]
            });
        },
        _initInput: function() {
            var input = this.getPart('input'),
                that = this;
            input.show();

            var list = this.getPart('list');
            var eventKey = {};
            eventKey.navigation = {
                pageUp: 33,
                pageDown: 34,
                end: 35,
                home: 36,
                up: 38,
                down: 40
            };
            eventKey.selection = {
                escape: 27,
                enter: 13
            };

            input.readOnly(!this.autoComplete());
            this.autoComplete.onChange(function() {
                input.readOnly(!this.autoComplete());
            });

            $(input.node).attr('autocomplete', 'off');

            input.placeholder(this.placeholder());
            this.placeholder.onChange(function() {
                input.placeholder(this.placeholder());
            });

            $(input.node).on('keydown', function(event) {
                var collection = list.items();
                if(!collection) {
                    return;
                }

                if(event.altKey) {
                    switch(event.keyCode) {
                        case eventKey.navigation.up:
                            that.closeList();
                            break;
                         case eventKey.navigation.down:
                            that.openList();
                            break;
                    }
                } else if (Object.values(eventKey.navigation).indexOf(event.keyCode) !== -1) { // keys navigation (up, down, ...)
                    var position = collection.getPosition(),
                        length = collection.length;
                    if(! that.isListOpen()) {
                        return;
                    }
                    switch(event.keyCode) {
                        case eventKey.navigation.pageUp:
                            position = Math.max(position - list.items.pageSize(), 0);
                            break;
                        case eventKey.navigation.pageDown:
                            position = Math.min(position + list.items.pageSize(), length -1);
                            break;
                        case eventKey.navigation.end:
                            position = length -1;
                            break;
                        case eventKey.navigation.home:
                            position = 0;
                            break;
                        case eventKey.navigation.up:
                            position = Math.max(position - 1, 0);
                            break;
                        case eventKey.navigation.down:
                            position = Math.min(position + 1, length -1);
                            break;
                    }

                    collection.select(position);

                } else if(Object.values(eventKey.selection).indexOf(event.keyCode) !== -1) { // escape, enter
                    if(! that.isListOpen()) {
                        return;
                    }
                    if (event.keyCode === eventKey.selection.enter) {
                        that.value(collection.getAttributeValue(that._getItemsMapping().value));
                    }
                    that.closeList();

                } else if(event.keyCode !== 18 && that.autoComplete()) { // auto completion
                    that._doSearch(input.node.value);
                }
            });
        },
        _initButton: function() {
            var button = this.getPart('button');
            button.show();

            button.subscribe('action', function(e) {
                if(this.isListOpen()) {
                    this.closeList();
                } else {
                    this.openList();
                }
            }, this);
        },
        _initList: function() {
            var list = this.getPart('list');
            var that = this;

            //list.scrollTimeAnimation(0);
            list.rowHeight(24);

            // hide list when clicking outside combobox
            $(document).on('mousedown', function(e) {
                if (that.isListOpen() && ! $(e.target).closest(that.node).length) {
                    that.closeList();
                    that._syncCollectionChangeHandler();
                }
            });
            $('input, button', this.node).on('blur', function(e) {
                if (!that.isListOpen()) {
                    return;
                }
                // If the blur event is caused by a click on the ListView, 
                // we should wait for this event to happen
                setTimeout(function() {
                    if (that.isListOpen()) {
                        that.closeList();
                        that._syncCollectionChangeHandler();
                    }
                }, 300);
            });

            list.subscribe('rowClick', function(e) {
                this.value(e.data.row.getAttribute('val'));
            }.bind(this));
        },
        _selectValueCombobox: function(value) {
            var collection = this.getListDatasource();
            var mapping = this._getItemsMapping();
            var items = this.items();
            var that = this;
            if(! collection) {
                return;
            }
            function _handleSelect() {
                if(collection.getAttribute(mapping.value).type === 'number' && ! isNaN(value)) {
                    value = parseFloat(value, 10);
                }

                collection.toArray([], {
                        filterQuery: mapping.value + '= :1',
                        params: [ value ],
                        retainPositions: true,
                        onSuccess: function(e) {
                            var position = e.result.length ? e.result[0].__POSITION : -1;
                            var length = e.result.length;
                            var options = {
                                onSuccess: function(evt) {
                                    that._refreshInputDisplay();
                                    if(length === 0) {
                                        that.fire('valueNotFound');
                                    } else if(length > 1) {
                                        that.fire('duplicateFound');
                                    } else {
                                        that.fire('changed');
                                    }

                                    // update display
                                    that._refreshInputDisplay();

                                    // synchronize or bind
                                    if(that.synchronize()) {
                                        if(collection.length &&  that.items().length && collection.getPosition() !== that.items().getPosition()) {
                                            // synchronize the value
                                            that._syncItemsElementChangeSubscriber.pause();
                                            var options = {};
                                            options.onSuccess = options.onError = function(e) { that._syncItemsElementChangeSubscriber.resume(); };
                                            that.items().select(collection.getPosition(), options);
                                        }
                                    }
                                },
                                onError: function(e) {
                                    console.error(e);
                                }
                            };
                            if(position === -1) {
                                options.onError = options.onSuccess;
                            }
                            collection.select(position, options);
                        },
                        onError: function(e) {
                            console.error(e);
                        }
                });
            }

            if(items.length === collection.length) {
                _handleSelect.call(this);
            } else {
                items.filterQuery('', {
                    destinationDataSource: collection._private.id,
                    onSuccess: function(e) {
                        _handleSelect.call(that);
                    },
                    onError: function(e) {
                        console.error(e);
                    }
                });
            }
        },
        getListDatasource: function() {
            return this.getPart('list').items();
        },
        closeList: function() {
            if(this.isListOpen()) {
                var list = this.getPart('list');
                $(this.node).css('z-index', this._lastzIndex);
                $(list.getScrollerNode()).scrollTop(0);
                list.hide();
                this.fire('closedList');
            }
        },
        _openList: function() {
            if(! this.isListOpen()) {
                this._lastzIndex = $(this.node).css('z-index');
                $(this.node).css('z-index', 9999999);
                this.getPart('list').show();
                this.fire('openedList');
            }
        },
        openList: function() {
            this._doSearch();
        },
        isListOpen: function() {
            return $(this.getPart('list').node).is(':visible');
        }
    });

    function duplicateDataSource(oldDs, widgetId) {
        if(! oldDs) {
            return;
        }
        var dsName = oldDs.datasourceName || 'private';
        var newDsParams = {
            'id': widgetId + '_' + dsName,
            'binding': oldDs.datasource._private.initialBinding,
            'data-initialQueryString': oldDs.datasource._private.initialQueryStr,
            'data-source-type': oldDs.datasource._private.sourceType,
            'data-initialOrderBy': oldDs.datasource._private.initialOrderBy
        };

        var newDs;
        switch(newDsParams['data-source-type']) {
            case 'relatedEntities':
                newDsParams['binding'] = oldDs.datasource._private.dataClassName;
                newDsParams['data-source-type'] = 'dataClass';
            case 'dataClass':
                newDs = WAF.dataSource.create(newDsParams);
                break;
            case 'array':
                window[newDsParams.id] = WAF.clone(oldDs.datasource._private.varRef);
                newDsParams.binding = newDsParams.id;
                var dataAttributes = oldDs.datasource.getAttributeNames().map(function(att) {
                        return att + ':' + oldDs.datasource.getClassAttributeByName(att).type || 'string';
                });
                newDsParams['data-attributes'] = dataAttributes.join(',');
                newDs = WAF.dataSource.create(newDsParams);
                newDs.sync();
                break;
            case 'scalar':
            case 'object':
            case 'relatedEntity':
            default:
                throw("not implemented duplicated datasource type : " + newDsParams['data-source-type']);
        }

        return newDs;
    }

    ComboBox.inherit('waf-behavior/layout/composed');
    ComboBox.setPart('input', TextInput);
    ComboBox.setPart('button', Button, { title: ' ' });
    ComboBox.setPart('list', ListView);

    ComboBox.addTabIndex();

    return ComboBox;
});
