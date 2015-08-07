/* global L */

// A wrapper object around a Leaflet layer object that is used for defining layer control behavior.
//  layer: The layer object to be controlled (REQUIRED).
//  name: The caption that should be used to display the layer in the layer control (REQUIRED).
//  groupName: If more than one LayerControlItem is given the same groupName, they will combined in a select (dropdown)
//    control which appears as a single entry in the layer control. The groupName will be used as a caption. (DEFAULT = name argument).
//  base: boolean - true if this is a base layer, false if this is an overlay layer (DEFAULT = false).
//  labelable: boolean - true if this layer can be labelled (DEFAULT = false).
function LayerControlItem(layer, name, groupName, base, labelable) {
  this.layer = layer;
  this.name = name;
  this.groupName = groupName || name;
  this.base = !!base;
  this.labelable = !!labelable;
}

// Enumeration of all possible clickable HTML elements for each layer group.
var LayerControlElementType = {
  VisibilityRadio: 1,
  VisibilityCheckbox: 2,
  LabelCheckbox: 3,
  LayerSelect: 4
};

// This is an internal class, used to group LayerControlItems by groupName.
// Since each table row in the layer control is a single LayerControlGroup rather than a LayerControl item, 
// all the HTML elements are associated with a group rather than an item.
function LayerControlGroup(layerControlItems, name, base) {
  this.layerControlItems = layerControlItems;
  this.name = name;
  this.base = !!base;

  this._anyLayerVisible = function (map) {
    for (var i in this.layerControlItems) {
      if (map.hasLayer(this.layerControlItems[i].layer)) return true;
    }
    return false;
  };

  this.anyLabelable = function () {
    for (var i in this.layerControlItems) {
      if (this.layerControlItems[i].labelable) return true;
    }
    return false;
  };

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
  this.createVisibleInputElement = function (map) {
    var checked = this._anyLayerVisible(map);
    if (this.base) {
      var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="leaflet-base-layers"';
      //var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="leaflet-exclusive-group-layer-' + this.group + '"';
      if (checked) {
        radioHtml += ' checked="checked"';
      }
      radioHtml += '/>';
      var radioFragment = document.createElement('div');
      radioFragment.innerHTML = radioHtml;
      radioFragment.firstChild.layerControlElementType = LayerControlElementType.VisibilityRadio;
      radioFragment.firstChild.groupName = this.name;
      return radioFragment.firstChild;
    } else {
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'leaflet-control-layers-selector';
      input.defaultChecked = checked;
      input.layerControlElementType = LayerControlElementType.VisibilityCheckbox;
      input.groupName = this.name;
      return input;
    }
  };

  this.createLabelInputElement = function () {
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'leaflet-control-layers-selector';
    input.defaultChecked = false;
    input.layerControlType = "label";
    input.layerControlElementType = LayerControlElementType.LabelCheckbox;
    input.groupName = this.name;
    return input;
  };

  this.createNameSpanElement = function () {
    var span = document.createElement('span');
    span.innerHTML = ' ' + this.name;
    span.groupName = name;
    return span;
  };

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
  this.createSelectElement = function (map) {
    // NOTE: Opening the select element and displaying the options list fires the select.onmouseout event which 
    // propagates to the div container and collapses the layer control. The onmouseout handler below will
    // stop this event from propagating. It has an if-else clause because IE handles this differently than other browsers.
    var selectHtml = '<select class="leaflet-control-layers-selector" onmouseout="if (arguments[0]) {arguments[0].stopPropagation();} else {window.event.cancelBubble();}">';

    for (var i = 0; i < this.layerControlItems.length; i++) {
      selectHtml += '<option value="' + this.layerControlItems[i].name + '"';
      if (map.hasLayer(this.layerControlItems[i].layer)) {
        selectHtml += " selected='selected'";
      }
      selectHtml += '>' + this.layerControlItems[i].name + "</option>";
    }
    selectHtml += '</select>';

    var selectFragment = document.createElement('div');
    selectFragment.innerHTML = selectHtml;
    selectFragment.firstChild.layerControlElementType = LayerControlElementType.LayerSelect;
    selectFragment.firstChild.groupName = this.name;
    return selectFragment.firstChild;
  };
}


// A layer control which provides for layer groupings.
// Author: Ishmael Smyrnow
// Revised: Matthew Katinsky
L.Control.GroupedLayers = L.Control.extend({
  options: {
    collapsed: true,
    position: 'topright',
    autoZIndex: true,
    labelCallback: null
  },

  initialize: function (layerControlItems, options) {
    var i;
    L.Util.setOptions(this, options);

    this._layerControlItems = {};
    this._groups = {};
    this._lastZIndex = 0;
    this._handlingClick = false;

    for (i in layerControlItems) {
      this._addLayerControlItem(layerControlItems[i]);
    }
  },

  _addLayerControlItem: function (layerControlItem) {
    var id = L.Util.stamp(layerControlItem.layer);

    this._layerControlItems[id] = layerControlItem;

    if (this.options.autoZIndex) {
      if (layerControlItem.layer.setZIndex) {
        this._lastZIndex++;
        layerControlItem.layer.setZIndex(this._lastZIndex);
      }
    }

    var groupName = layerControlItem.groupName;
    if (!this._groups[groupName]) {
      var group = new LayerControlGroup([], layerControlItem.groupName, layerControlItem.base);
      this._groups[groupName] = group;
    }
    this._groups[groupName].layerControlItems.push(layerControlItem);
  },

  onAdd: function (map) {
    this._initLayout();
    this._update();

    map
      .on('layeradd', this._onLayerChange, this)
      .on('layerremove', this._onLayerChange, this);

    return this._container;
  },

  onRemove: function (map) {
    map
      .off('layeradd', this._onLayerChange)
      .off('layerremove', this._onLayerChange);
  },

  addBaseLayer: function (layer, name) {
    this._addLayerControlItem(new LayerControlItem(layer, name, true));
    this._update();
    return this;
  },

  addOverlay: function (layer, name, group) {
    this._addLayerControlItem(new _addLayerControlItem(layer, name, false, group));
    this._update();
    return this;
  },

  removeLayer: function (layer) {
    var id = L.Util.stamp(layer);
    var layerControlItem = this._layerControlItems[id];
    if (layerControlItem && layerControlItem.groupName && this._groups[layerControlItem.groupName]) {
      var group = this._groups[layerControlItem.groupName];
      var index = group.indexOf(layerControlItem);
      if (index > -1) group.splice(index, 1);
      if (group.length === 0) delete this._groups[layerControlItem.groupName];
    }
    delete this._layerControlItems[id];
    this._update();
    return this;
  },

  _initLayout: function () {
    var className = 'leaflet-control-layers',
      container = this._container = L.DomUtil.create('div', className);

    //Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute('aria-haspopup', true);

    if (!L.Browser.touch) {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
    } else {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }

    var form = this._form = L.DomUtil.create('form', className + '-list');

    if (this.options.collapsed) {
      if (!L.Browser.android) {
        L.DomEvent
          .on(container, 'mouseover', this._expand, this)
          .on(container, 'mouseout', this._collapse, this);
      }
      var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
      link.href = '#';
      link.title = 'Layers';

      if (L.Browser.touch) {
        L.DomEvent
          .on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', this._expand, this);
      } else {
        L.DomEvent.on(link, 'focus', this._expand, this);
      }

      this._map.on('click', this._collapse, this);
      // TODO keyboard accessibility
    } else {
      this._expand();
    }

    this._baseLayersTable = L.DomUtil.create('table', className + '-base', form);
    this._separator = L.DomUtil.create('div', className + '-separator', form);
    this._overlaysTable = L.DomUtil.create('table', className + '-overlays', form);
    this._insertOverlaysTableHeader();

    container.appendChild(form);
  },

  _insertOverlaysTableHeader: function () {
    var tr = document.createElement("tr");
    var visibleImage = document.createElement("img");
    visibleImage.src = "img/visibility.png";
    visibleImage.alt = "Toggle layer on/off.";
    var th = document.createElement("th");
    th.appendChild(visibleImage);
    tr.appendChild(th);
    if (this.options.labelCallback) {
      var labelImage = document.createElement("img");
      labelImage.src = "img/label.png";
      labelImage.alt = "Toggle labels on/off.";
      th = document.createElement("th");
      th.appendChild(labelImage);
      tr.appendChild(th);
    }
    th = document.createElement("th");
    th.innerHTML = "Layer";
    tr.appendChild(th);
    this._overlaysTable.appendChild(tr);
  },

  _update: function () {
    if (!this._container) {
      return;
    };
    this._baseLayersTable.innerHTML = '';
    this._overlaysTable.innerHTML = '';
    this._insertOverlaysTableHeader();

    var baseLayersPresent = false,
        overlaysPresent = false,
        name, group;

    for (groupName in this._groups) {
      var group = this._groups[groupName];
      this._addGroup(group);
      overlaysPresent = overlaysPresent || !group.base;
      baseLayersPresent = baseLayersPresent || group.base;
    }

    this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
  },

  _onLayerChange: function (e) {
    var obj = this._layerControlItems[L.Util.stamp(e.layer)];

    if (!obj) { return; }

    if (!this._handlingClick) {
      this._update();
    }

    var type = !obj.base ?
      (e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
      (e.type === 'layeradd' ? 'baselayerchange' : null);

    if (type) {
      this._map.fire(type, obj.layer);
    }
  },

  _addGroup: function (group) {
    //var label = document.createElement('label'),
    var tr, td,
        input, labelInput,
        container, select;

    tr = document.createElement('tr');

    input = group.createVisibleInputElement(this._map);
    //input.layerId = L.Util.stamp(obj.layer);
    L.DomEvent.on(input, 'click', this._onLayerControlElementClick, this);
    td = document.createElement('td');
    td.appendChild(input);
    tr.appendChild(td);

    if (this.options.labelCallback) {
      td = document.createElement('td');
      if (group.anyLabelable()) {
        labelInput = group.createLabelInputElement();
        td.appendChild(labelInput);
        L.DomEvent.on(labelInput, 'click', this._onLayerControlElementClick, this);
      } else {
        td.innerHTML = "&nbsp;";
      }
      tr.appendChild(td);
    }

    td = document.createElement('td');
    td.appendChild(group.createNameSpanElement());

    if (group.layerControlItems.length > 1) {
      select = group.createSelectElement(this._map);
      L.DomEvent.on(select, 'change', this._onLayerControlElementClick, this);
      td.appendChild(select);
    }
    tr.appendChild(td);

    container = group.base ? this._baseLayersTable : this._overlaysTable;
    container.appendChild(tr);

    return tr;
  },

  _getSelect: function (selects, layerId) {
    for (var i = 0; i < selects.length; i++) {
      if (selects[i].layerId === layerId) {
        return selects[i];
      }
    }
    return null;
  },

  _onLayerControlElementClick: function (evt) {
    var i, selectedGroup, selectedLayerControlItem, layerControlItem;

    this._handlingClick = true;

    selectedGroup = this._groups[evt.currentTarget.groupName];
    selectedLayerControlItem = this._getSelectedLayerControlItemForGroup(selectedGroup);

    switch (evt.currentTarget.layerControlElementType) {
      case LayerControlElementType.VisibilityRadio:
        for (i in this._layerControlItems) {
          layerControlItem = this._layerControlItems[i];
          if (layerControlItem.base) {
            this._toggerLayerVisibility(layerControlItem.layer, layerControlItem === selectedLayerControlItem);
          }
        }
        break;

      case LayerControlElementType.VisibilityCheckbox:
        for (i in selectedGroup.layerControlItems) {
          layerControlItem = selectedGroup.layerControlItems[i];
          this._toggerLayerVisibility(layerControlItem.layer, layerControlItem === selectedLayerControlItem && evt.currentTarget.checked);
        }
        break;

      case LayerControlElementType.LabelCheckbox:
        if (this.options.labelCallback) {
          this.options.labelCallback(this._getLabeledLayerControlItems());
        }
        break;

      case LayerControlElementType.LayerSelect:
        for (i in selectedGroup.layerControlItems) {
          layerControlItem = selectedGroup.layerControlItems[i];
          this._toggerLayerVisibility(layerControlItem.layer, layerControlItem === selectedLayerControlItem && this._isVisible(selectedGroup));
        }
        if (this.options.labelCallback) {
          this.options.labelCallback(this._getLabeledLayerControlItems());
        }
        break;
    }

    this._handlingClick = false;
  },

  _toggerLayerVisibility: function (layer, visible) {
    var currentVisibility = this._map.hasLayer(layer);
    if (currentVisibility !== visible) {
      if (visible) {
        this._map.addLayer(layer);
      } else {
        this._map.removeLayer(layer);
      }
    }
  },

  _getLabeledLayerControlItems: function () {
    var result = [];
    var inputs = this._form.getElementsByTagName('input');
    for (var i in inputs) {
      var input = inputs[i];
      if (input.layerControlElementType === LayerControlElementType.LabelCheckbox && input.checked) {
        result.push(this._getSelectedLayerControlItemForGroup(input.groupName));
      }
    }
    return result;
  },
  
  _getSelectedLayerControlItemForGroup: function (group) {
    if (group.constructor !== LayerControlGroup) { group = this._groups[group]; }
    if (!group) { return null; }
    if (group.layerControlItems.length === 1) { return group.layerControlItems[0]; }
    var select = this._getSelectForGroup(group);
    var layerControlItemName = select.options[select.selectedIndex].value;
    var layerControlItem = this._getLayerControlItemByName(group, layerControlItemName);
    return layerControlItem;
  },

  _getSelectForGroup: function (group) {
    if (group.constructor !== LayerControlGroup) { group = this._groups[group]; }
    if (!group) { return null; }
    var selects = this._form.getElementsByTagName('select');
    for (var i in selects) {
      var select = selects[i];
      if (select.groupName === group.name) { return select; }
    }
    return null;
  },

  _getLayerControlItemByName: function (group, name) {
    for (var i in group.layerControlItems) {
      if (group.layerControlItems[i].name === name) { return group.layerControlItems[i]; }
    }
    return null;
  },

  _isVisible: function (group) {
    var inputs = this._form.getElementsByTagName('input');
    for (var i in inputs) {
      var input = inputs[i];
      if (input.groupName === group.name &&
         (input.layerControlElementType === LayerControlElementType.VisibilityRadio ||
          input.layerControlElementType === LayerControlElementType.VisibilityCheckbox)) {
        return input.checked;
      }
    }
    return false;
  },

  _expand: function () {
    L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
  },

  _collapse: function () {
    this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
  },

  _indexOf: function (arr, obj) {
    for (var i = 0, j = arr.length; i < j; i++) {
      if (arr[i] === obj) {
        return i;
      }
    }
    return -1;
  }
});

L.control.groupedLayers = function (layerControlItems, options) {
  return new L.Control.GroupedLayers(layerControlItems, options);
};
