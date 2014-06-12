Leaflet.groupedlayercontrol
===========================

Leaflet layer control with support for grouping overlays together.

![preview](preview.png)

[Demo](http://ismyrnow.github.io/Leaflet.groupedlayercontrol/example/basic.html)

## Usage

### Initialization

Add groupings to your overlay layers object, and swap out the default layer
control with the new one.

```javascript
var groupedOverlays = {
  "Landmarks": {
    "Motorways": motorways,
    "Cities": cities
  },
  "Points of Interest": {
    "Restaurants": restaurants
  }
};

L.control.groupedLayers(baseLayers, groupedOverlays).addTo(map);
```

The [example](example/basic.html) shows its usage with various layers.

### Adding a layer

Adding a layer individually works similarly to the default layer control,
except that you can also specify a group name, along with the layer and layer name.

```javascript
layerControl.addOverlay(cities, "Cities", "Landmarks").
```

## Note

This plugin only affects how the layers are dislpayed in the layer control,
and not how they are rendered or layered on the map.

Grouping base layers is not currently supported.

## License

Leaflet.groupedlayercontrol is free software, and may be redistributed under 
the MIT-LICENSE.
