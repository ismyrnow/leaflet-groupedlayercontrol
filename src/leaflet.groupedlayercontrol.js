/* global L */

// A layer control which provides for layer groupings.
// Author: Ishmael Smyrnow
L.Control.GroupedLayers = L.Control.extend({

  options: {
    collapsed: true,
    position: 'topright',
    autoZIndex: true,
    exclusiveGroups: []
  },

  initialize: function (baseLayers, groupedOverlays, options)
  {
    var i, j;
    L.Util.setOptions(this, options);

    this._layers = {};
    this._lastZIndex = 0;
    this._handlingClick = false;
    this._groupList = [];
    this._domGroups = [];

    for (i in baseLayers)
    {
      this._addLayer(baseLayers[i], i);
    }

    for (i in groupedOverlays)
    {
      for (var j in groupedOverlays[i])
      {
        this._addLayer(groupedOverlays[i][j], j, i, true);
      }
    }
  },

  onAdd: function (map)
  {
    this._initLayout();
    this._update();

    map
        .on('layeradd', this._onLayerChange, this)
        .on('layerremove', this._onLayerChange, this);

    return this._container;
  },

  onRemove: function (map)
  {
    map
        .off('layeradd', this._onLayerChange)
        .off('layerremove', this._onLayerChange);
  },

  addBaseLayer: function (layer, name)
  {
    this._addLayer(layer, name);
    this._update();
    return this;
  },

  addOverlay: function (layer, name, group)
  {
    this._addLayer(layer, name, group, true);
    this._update();
    return this;
  },

  removeLayer: function (layer)
  {
    var id = L.Util.stamp(layer);
    delete this._layers[id];
    this._update();
    return this;
  },

  _initLayout: function ()
  {
    var className = 'leaflet-control-layers',
        container = this._container = L.DomUtil.create('div', className);

    //Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute('aria-haspopup', true);

    if (!L.Browser.touch)
    {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
    } else
    {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }

    var form = this._form = L.DomUtil.create('form', className + '-list');

    if (this.options.collapsed)
    {
      if (!L.Browser.android)
      {
        L.DomEvent
            .on(container, 'mouseover', this._expand, this)
            .on(container, 'mouseout', this._collapse, this);
      }
      var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
      link.href = '#';
      link.title = 'Layers';

      if (L.Browser.touch)
      {
        L.DomEvent
            .on(link, 'click', L.DomEvent.stop)
            .on(link, 'click', this._expand, this);
      }
      else
      {
        L.DomEvent.on(link, 'focus', this._expand, this);
      }

      this._map.on('click', this._collapse, this);
      // TODO keyboard accessibility
    } else
    {
      this._expand();
    }

    this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
    this._separator = L.DomUtil.create('div', className + '-separator', form);
    this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

    container.appendChild(form);
  },

  _addLayer: function (layer, name, group, overlay)
  {
    var id = L.Util.stamp(layer);

    this._layers[id] = {
      layer: layer,
      name: name,
      overlay: overlay
    };

    group = group || '';
    var groupId = this._indexOf(this._groupList, group);

    if (groupId === -1)
    {
      groupId = this._groupList.push(group) - 1;
    }

    var exclusive = (this._indexOf(this.options.exclusiveGroups, group) != -1);

    this._layers[id].group = {
      name: group,
      id: groupId,
      exclusive: exclusive
    };

    if (this.options.autoZIndex)
    {
      if (layer.length)
      {
        var self = this;
        layer.forEach(function (item)
        {
          if (item.layer.setZIndex)
          {
            self._lastZIndex++;
            item.layer.setZIndex(self._lastZIndex);
          }
        });
      } else
      {
        if (layer.setZIndex)
        {
      this._lastZIndex++;
      layer.setZIndex(this._lastZIndex);
    }
      }
    }
  },

  _update: function ()
  {
    if (!this._container)
    {
      return;
    }

    this._baseLayersList.innerHTML = '';
    this._overlaysList.innerHTML = '';
    this._domGroups.length = 0;

    var baseLayersPresent = false,
        overlaysPresent = false,
        i, obj;

    for (i in this._layers)
    {
      obj = this._layers[i];
      this._addItem(obj);
      overlaysPresent = overlaysPresent || obj.overlay;
      baseLayersPresent = baseLayersPresent || !obj.overlay;
    }

    this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
  },

  _onLayerChange: function (e)
  {
    var obj = this._layers[L.Util.stamp(e.layer)];

    if (!obj) { return; }

    if (!this._handlingClick)
    {
      this._update();
    }

    var type = obj.overlay ?
      (e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
      (e.type === 'layeradd' ? 'baselayerchange' : null);

    if (type)
    {
      this._map.fire(type, obj);
    }
  },

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
  _createRadioElement: function (name, checked)
  {

    var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
    if (checked)
    {
      radioHtml += ' checked="checked"';
    }
    radioHtml += '/>';

    var radioFragment = document.createElement('div');
    radioFragment.innerHTML = radioHtml;

    return radioFragment.firstChild;
  },

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
  _createSelectElement: function (layers)
  {
    // NOTE: Opening the select element and displaying the options list fires the select.onmouseout event which 
    // propagates to the div container and collapses the layer control. The onmouseout handler below will
    // stop this event from propagating. It has an if-else clause because IE handles this differently than other browsers.
    var selectHtml = '<select class="leaflet-control-layers-selector" onmouseout="if (arguments[0]) {arguments[0].stopPropagation();} else {window.event.cancelBubble();}">';

    for (var i = 0; i < layers.length; i++)
    {
      selectHtml += '<option value="' + layers[i].name + '"';
      if (this._map.hasLayer(layers[i].layer))
      {
        selectHtml += " selected='selected'";
      }
      selectHtml += '>' + layers[i].name + "</option>";
    }
    selectHtml += '</select>';

    var selectFragment = document.createElement('div');
    selectFragment.innerHTML = selectHtml;

    return selectFragment.firstChild;
  },

  _hasAtLeastOneLayer: function (layers)
  {
    for (var i = 0; i < layers.length; i++)
    {
      if (this._map.hasLayer(layers[i].layer))
      {
        return true;
      }
    }
    return false;
  },

  _addItem: function (obj)
  {
    var label = document.createElement('label'),
        input,
        checked = obj.layer.length ? this._hasAtLeastOneLayer(obj.layer) : this._map.hasLayer(obj.layer),
        container;

    if (obj.overlay)
    {
      if (obj.group.exclusive)
      {
        groupRadioName = 'leaflet-exclusive-group-layer-' + obj.group.id;
        input = this._createRadioElement(groupRadioName, checked);
      } else
      {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'leaflet-control-layers-selector';
        input.defaultChecked = checked;
      }
    } else
    {
      input = this._createRadioElement('leaflet-base-layers', checked);
    }

    input.layerId = L.Util.stamp(obj.layer);

    L.DomEvent.on(input, 'click', this._onInputClick, this);

    var name = document.createElement('span');
    name.innerHTML = ' ' + obj.name;

    label.appendChild(input);
    label.appendChild(name);

    if (obj.layer.length)
    {
      var select = this._createSelectElement(obj.layer);
      L.DomEvent.on(select, 'change', this._onInputClick, this);
      select.layerId = L.Util.stamp(obj.layer);
      label.appendChild(select);
    }

    if (obj.overlay)
    {
      container = this._overlaysList;

      var groupContainer = this._domGroups[obj.group.id];

      // Create the group container if it doesn't exist
      if (!groupContainer)
      {
        groupContainer = document.createElement('div');
        groupContainer.className = 'leaflet-control-layers-group';
        groupContainer.id = 'leaflet-control-layers-group-' + obj.group.id;

        var groupLabel = document.createElement('span');
        groupLabel.className = 'leaflet-control-layers-group-name';
        groupLabel.innerHTML = obj.group.name;

        groupContainer.appendChild(groupLabel);
        container.appendChild(groupContainer);

        this._domGroups[obj.group.id] = groupContainer;
      }

      container = groupContainer;
    } else
    {
      container = this._baseLayersList;
    }

    container.appendChild(label);

    return label;
  },

  _getSelect: function (selects, layerId)
  {
    for (var i = 0; i < selects.length; i++)
    {
      if (selects[i].layerId === layerId)
      {
        return selects[i];
      }
    }
    return null;
  },

  _onInputClick: function ()
  {
    var i, input, obj,
        inputs = this._form.getElementsByTagName('input'),
        inputsLen = inputs.length,
        selects = this._form.getElementsByTagName('select'),
        select,
        layer, selected, visible;

    this._handlingClick = true;

    for (i = 0; i < inputsLen; i++)
    {
      input = inputs[i];
      obj = this._layers[input.layerId];

      if (input.checked)
      {
        if (obj.layer.length)
        {
          for (var j = 0; j < obj.layer.length; j++)
          {
            layer = obj.layer[j].layer;
            select = this._getSelect(selects, input.layerId);
            selected = select[j].selected;
            visible = this._map.hasLayer(layer);
            if (visible && !selected) { this._map.removeLayer(layer); }
            else if (!visible && selected) { this._map.addLayer(layer); }
          }
        } else
        {
          if (!this._map.hasLayer(obj.layer))
          {
        this._map.addLayer(obj.layer);
          }
        }
      } else
      {
        if (obj.layer.length)
        {
          for (var j = 0; j < obj.layer.length; j++)
          {
            layer = obj.layer[j].layer;
            visible = this._map.hasLayer(layer);
            if (visible) { this._map.removeLayer(layer); }
          }
        } else
        {
          if (this._map.hasLayer(obj.layer))
          {
        this._map.removeLayer(obj.layer);
      }
    }
      }
    }

    this._handlingClick = false;
  },

  _expand: function ()
  {
    L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
  },

  _collapse: function ()
  {
    this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
  },

  _indexOf: function (arr, obj)
  {
    for (var i = 0, j = arr.length; i < j; i++)
    {
      if (arr[i] === obj)
      {
        return i;
      }
    }
    return -1;
  }
});

L.control.groupedLayers = function (baseLayers, groupedOverlays, options)
{
  return new L.Control.GroupedLayers(baseLayers, groupedOverlays, options);
};
