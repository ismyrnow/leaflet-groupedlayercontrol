Leaflet.groupedlayercontrol
===========================

Leaflet layer control with support for grouping overlays together.

[Demo](http://bl.ocks.org/ismyrnow/6123517)

## Usage
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

![preview](preview.png)

The [example](example/basic.html) shows some basic CSS styling of the new control elements.

## Note

This plugin only affects how the layers are dislpayed in the layer control,
and not how they are rendered or layered on the map.

Grouping base layers is not currently supported.

## License

Leaflet.groupedlayercontrol is free software, and may be redistributed under 
the MIT-LICENSE.