WAF.define('ComboBox', ['waf-core/widget', 'TextInput', 'Button', 'wListView'], function(widget, TextInput, Button, wListView) {
    "use strict";

    var ComboBox = widget.create('ComboBox', {
        tagName: 'div',
        value: widget.property(),
        synchroize: widget.property({ type: 'boolean', bindable: false }),
        autoComplete: widget.property({ type: 'boolean', bindable: false, defaultValue: true }),
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
        placeholder: widget.property({ type: 'string', bindable: false }),
        template: widget.property({
            type: 'template',
            templates: [
                {
                    name: 'Text only',
                    template: '<li role="option" val={{value}}>\
                                            {{List}}\
                              </li>'
                },
                {
                    name: 'Image and text',
                    template: '<li role="option" val={{value}}>\
                                            <p style="text-align: right;">\
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
            pageSize: 40
        }),
        render: function() { },
        _synchronizeDupDsPosition: function(callBackOptions) {
            var collection = this.getPart('list').collection();
            var boundDatasource = this.items.boundDatasource();
            if(! collection || ! boundDatasource)
                return;

            if(collection.getPosition() === boundDatasource.datasource.getPosition()) {
                if(callBackOptions.onSuccess) callBackOptions.onSuccess.call(this);
                return;
            }

            var options = {
                onSuccess: function(e) {
                    if(callBackOptions.onSuccess) callBackOptions.onSuccess.call(this);
                }.bind(this),
                onError: function(e) {
                    if(callBackOptions.onError) callBackOptions.onError.call(this);
                }.bind(this)
            };

            collection.select(boundDatasource.datasource.getPosition(), options);
        },
        _syncCollectionChangeHandler: function() {
            var boundDatasource = this.items.boundDatasource();
            var collection = this.getPart('list').collection();
            var that = this;
            if(! collection)
                return;

            function _pauseOrResume(bool) {
                if(that.synchroize()) {
                    that._syncDupDsElementChangeSubscriber[bool ? 'pause' : 'resume']();
                    that._syncBoundDsElementChangeSubscriber[bool ? 'pause' : 'resume']();
                } else {
                    that._dupDsElementChangeSetBindSubscriber[bool ? 'pause' : 'resume']();
                    if(that._boundValueDsElementChangeSubscriber)
                        that._boundValueDsElementChangeSubscriber[bool ? 'pause' : 'resume']();
                }
            }
            _pauseOrResume(true);
            var options = {
                destinationDataSource: collection._private.id,
                onSuccess: function(e) {
                    var opt = {};
                    opt.onSuccess = opt.onError = function(e) { _pauseOrResume(false); };
                    if(that.synchroize()) {
                        that._synchronizeDupDsPosition(opt);
                    } else {
                        var boundValueDatasource = this.value.boundDatasource();
                        if(boundValueDatasource && boundValueDatasource.datasource) {
                            var value = boundValueDatasource.datasource.getAttributeValue(boundValueDatasource.attribute);
                            that._selectValueCombobox(value, opt);
                        } else {
                            _pauseOrResume(false);
                        }
                    }
                }.bind(this)
            };
            boundDatasource.datasource.filterQuery('', options);
        },
        init: function() {
            this._initInput();
            this._initButton();
            this._initList();
            this._changeCssClassName();

            var boundDatasource = this.items.boundDatasource();
            var boundValueDatasource = this.value.boundDatasource();
            var collection = this.getPart('list').collection();
            var mapping = this._getItemsMapping();
            var that = this;

            // datasource events
            if(collection) {
                // synchronize if collection change
                this._syncBoundDsCollectionChangeSubscriber = boundDatasource.datasource.subscribe('collectionChange', function(e) { 
                    this._syncCollectionChangeHandler();
                }.bind(this));

                this._dupDsElementChangeSubscriber = collection.subscribe('currentElementChange', function(e) {
                    var value = collection.getAttributeValue(mapping.value);
                    // update the display
                    that.getPart('input').value(collection.getAttributeValue(mapping.display));
                    that.fire('changed');
                }.bind(this));

                this._syncDupDsElementChangeSubscriber = collection.subscribe('currentElementChange', function(e) {
                    // synchronize with origin datasource
                    if(this.synchroize()) {
                        if(collection.length &&  boundDatasource.datasource.length && collection.getPosition() != boundDatasource.datasource.getPosition()) {
                            that._syncBoundDsElementChangeSubscriber.pause();
                            var options = {};
                            options.onSuccess = options.onError = function(e) { that._syncBoundDsElementChangeSubscriber.resume(); };
                            boundDatasource.datasource.select(collection.getPosition(), options);
                        }
                    }
                }.bind(this));

                this._dupDsElementChangeSetBindSubscriber = collection.subscribe('currentElementChange', function(e) {
                    if(! this.synchroize()) {
                        var value = collection.getAttributeValue(mapping.value);
                        this._setBindValue(value);
                    }
                }.bind(this));

                // update selected after bind value change
                if(! this.synchroize() && boundValueDatasource && boundValueDatasource.datasource && boundDatasource) {
                    this._boundValueDsElementChangeSubscriber = boundValueDatasource.datasource.subscribe('currentElementChange', function(e) {
                        var value = boundValueDatasource.datasource.getAttributeValue(boundValueDatasource.attribute);
                        this._dupDsElementChangeSetBindSubscriber.pause();
                        var options = {};
                        options.onSuccess = options.onError = function(e) { this._dupDsElementChangeSetBindSubscriber.resume(); };
                        this._selectValueCombobox(value, options);
                    }.bind(this));
                }

                this._syncBoundDsElementChangeSubscriber = boundDatasource.datasource.subscribe('currentElementChange', function(e) {
                    if(that.synchroize()) {
                        if(boundDatasource.datasource.length &&  collection.length && boundDatasource.datasource.getPosition() != collection.getPosition()) {
                            that._syncDupDsElementChangeSubscriber.pause();
                            var options = {};
                            options.onSuccess = options.onError = function(e) { that._syncDupDsElementChangeSubscriber.resume(); };
                            collection.select(boundDatasource.datasource.getPosition(), options);
                        }
                    }
                });

            }
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
        selectElement: function(value) {
            this._selectValueCombobox(value);
            this._closeList();
        },
        _getItemsMapping: function() {
            var mapping = {};
            var boundDatasource = this.items.boundDatasource();

            if(this.items.mapping()) {
                mapping = this.items.mapping();

            } else if(boundDatasource && ! boundDatasource.datasourceName
                      && boundDatasource.datasource._private.sourceType === 'array') {
                // in this case, the datasource is from static value cbx form configuration
                boundDatasource.datasource.getAttributeNames().forEach(function(att) { mapping[att] = att; });
            }

            return mapping;
        },
        _doSearch: function(value) {
            var collection = this.getPart('list').collection();
            var boundDatasource = this.items.boundDatasource();

            // search attribute
            var mapping = this._getItemsMapping();
            var searchAttribute = mapping.display;

            if(! collection || ! searchAttribute) {
                return;
            }
            // query datasource
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

            this._dupDsElementChangeSubscriber.pause();
            this._dupDsElementChangeSetBindSubscriber.pause();
            this._syncDupDsElementChangeSubscriber.pause();
            boundDatasource.datasource.filterQuery(queryString, {
                onSuccess: function(e) {
                    var options = {};
                    options.onSuccess = options.onError = function(e) {
                        this._openList();
                        this._dupDsElementChangeSubscriber.resume();
                        this._dupDsElementChangeSetBindSubscriber.resume();
                        this._syncDupDsElementChangeSubscriber.resume();
                    }.bind(this);
                    collection.select(-1, options);
                }.bind(this),
                onError: function(e) {
                    console.error(e);
                },
                destinationDataSource: collection._private.id,
                params: [ value ]
            });
        },
        _initButton: function() {
            var button = this.getPart('button');
            button.show();

            $(button.node).on('click', function(e) {
                if(this._isListOpen())
                    this._closeList();
                else
                    this._doSearch();
            }.bind(this));
        },
        _initInput: function() {
            var input = this.getPart('input');
            input.show();

            // autocomplete
            $(input.node).attr('readonly', ! this.autoComplete());

            // placeholder
            $(input.node).attr('placeholder', this.placeholder());

            $(input.node).on('keyup', function(e) {
                var value = input.node.value;
                this._doSearch(value);
            }.bind(this));
        },
        _initList: function() {
            var list = this.getPart('list');
            var bound = this.value.boundDatasource();
            var boundDatasource = this.items.boundDatasource();

            // at execution, bind datasource to list
            if(this.items()) {
                if(boundDatasource) {
                    var duplicateDs = this._duplicateDataSource(boundDatasource);
                    list.collection(duplicateDs);
                } else {
                    list.collection(null);
                }
                list.template(this.template());
                if(this.items.mapping()) {
                    list.collection.setMapping(this.items.mapping());
                }
            }

            // hide list when clicking outside combobox
            $(document).on('click', function(e) {
                if (this._isListOpen() && ! $(e.target).closest(this.node).length) {
                    this._closeList();
                    this._syncCollectionChangeHandler();
                }
            }.bind(this));

            $(list.node).on('click', function(e) {
                var value = $(e.target).closest('li').attr('val');
                this.selectElement(value);
                this._closeList();
            }.bind(this));
        },
        // executed only in the change of the combobox selected value
        _setBindValue: function(value) {
            var bound = this.value.boundDatasource();
            var collection = this.getPart('list').collection();
            var mapping = this._getItemsMapping();
            if(this.synchroize() || ! bound) return;

            var boundAttribute = bound.datasource.getAttribute(bound.attribute);
            if(boundAttribute.kind === 'relatedEntity') {
                var oldValue = bound.datasource[bound.attribute].getKey();
                if(oldValue === collection.getKey())
                    return;
                this._boundValueDsElementChangeSubscriber.pause();
                bound.datasource[bound.attribute].set(collection);
                this._boundValueDsElementChangeSubscriber.resume();
            } else {
                var oldValue = bound.datasource.getAttributeValue(bound.attribute);
                var newValue = collection.getAttributeValue(mapping.value);
                if(oldValue === newValue)
                    return;
                this._boundValueDsElementChangeSubscriber.pause();
                bound.datasource.setAttributeValue(bound.attribute, newValue);
                this._boundValueDsElementChangeSubscriber.resume();
            }
        },
        _closeList: function() {
            if(this._isListOpen()) {
                $(this.node).css('z-index', this._lastzIndex);
                this.getPart('list').hide();
                this.fire('close');
            }
        },
        _openList: function() {
            if(! this._isListOpen()) {
                this._lastzIndex = $(this.node).css('z-index');
                $(this.node).css('z-index', 9999999);
                this.getPart('list').show();
                this.fire('open');
            }
        },
        _isListOpen: function() {
            return $(this.getPart('list').node).is(':visible');
        },
        _selectValueCombobox: function(value, callBackOptions) {
            var collection = this.getListDatasource();
            var mapping = this._getItemsMapping();
            var boundDatasource = this.items.boundDatasource();
            var that = this;
            if(! collection) {
                return;
            }
            var filterQuery = mapping.value + '="' + value + '"';
            function _handleSelect() {
                collection.toArray([], {
                        filterQuery: filterQuery,
                        retainPositions: true,
                        onSuccess: function(e) {
                            console.info('> filterQuery : ' + filterQuery + ' id : ' + that.id);
                            var position = e.result.length ? e.result[0].__POSITION : -1;
                            var length = e.result.length;
                            var options = {
                                onSuccess: function(evt) {
                                    that.getPart('input').value(collection.getAttributeValue(mapping.display));
                                    if(length === 0)
                                        that.fire('notFound')
                                    else if(length > 1)
                                        that.fire('doublonFound');
                                    else
                                        that.fire('changed');

                                    if(callBackOptions && callBackOptions.onSuccess) callBackOptions.onSuccess.call(that);
                                },
                                onError: function(evt) {
                                    if(callBackOptions && callBackOptions.onError) callBackOptions.onError.call(that);
                                }
                            };
                            if(position === -1) {
                                options.onError = options.onSuccess;
                            }
                            collection.select(position, options);
                        },
                        onError: function(e) {
                            if(callBackOptions && callBackOptions.onError) callBackOptions.onError.call(that);
                        }
                });
            }

            if(boundDatasource.datasource.length === collection.length) {
                _handleSelect.call(this);
            } else {
                boundDatasource.datasource.filterQuery('', {
                    destinationDataSource: collection._private.id,
                    onSuccess: function(e) {
                        _handleSelect.call(that);
                    },
                    onError: function(e) {
                    }
                });
            }
        },
        getListDatasource: function() {
            return this.getPart('list').collection();
        },
        _duplicateDataSource: function(oldDs) {
            if(! oldDs) return;
            var dsName = oldDs.datasourceName || 'private';
            var newDsParams = {
                'id': this.id + '_' + dsName,
                'binding': oldDs.datasource._private.initialBinding,
                'data-initialQueryString': oldDs.datasource._private.initialQueryStr,
                'data-source-type': oldDs.datasource._private.sourceType,
                'data-initialOrderBy': oldDs.datasource._private.initialOrderBy
            };

            function _tmptoArray(arr, attributes, options) {
                var arrRef = this._private._getFullSet();
                if(! (attributes instanceof Array)) {
                    options = attributes;
                }
                var filters = options.filterQuery.split('=');
                var attribute, value;
                if(filters.length == 2) {
                    attribute = filters[0].trim();
                    value = filters[1].trim();
                    value = value.replace(/^('(.*)')|("(.*)")$/, "$2$4");
                } else {
                    if(options.onError) options.onError.call();
                }

                for(var i=0; i < this.length; i++) {
                    if(arrRef[i][attribute] == value) {
                        var elm = WAF.clone(arrRef[i]);
                        elm.__POSITION = i;
                        arr.push(elm);
                    }
                }
                if(options.onSuccess) {
                    options.onSuccess({ result: arr });
                }
            }

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
                    var dataAttributes = oldDs.datasource.getAttributeNames().map(function(att) { return att + ':string'; });
                    newDsParams['data-attributes'] = dataAttributes.join(',');
                    newDs = WAF.dataSource.create(newDsParams);
                    newDs.toArray = _tmptoArray.bind(newDs);
                    newDs.sync();
                    break;
                case 'scalar':
                case 'object':
                case 'relatedEntity':
                default:
                    throw("not implemented duplicated datasource type : " + newDsParams['data-source-type']);
                    break;
            }

            return newDs;
        }
    });

    ComboBox.inherit('waf-behavior/layout/composed');
    ComboBox.setPart('input', TextInput);
    ComboBox.setPart('button', Button);
    ComboBox.setPart('list', wListView);

    return ComboBox;
});
