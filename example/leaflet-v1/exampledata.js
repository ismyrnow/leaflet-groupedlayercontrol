(function () {
  var basemaps = {
    OpenStreetMap: L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ),
    ["OpenStreetMap.HOT"]: L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
      },
    ),
  };

  var groups = {
    cities: new L.LayerGroup(),
    restaurants: new L.LayerGroup(),
    dogs: new L.LayerGroup(),
    cats: new L.LayerGroup(),
  };

  L.marker([39.61, -105.02]).bindPopup("Littleton, CO.").addTo(groups.cities);
  L.marker([39.74, -104.99]).bindPopup("Denver, CO.").addTo(groups.cities);
  L.marker([39.73, -104.8]).bindPopup("Aurora, CO.").addTo(groups.cities);
  L.marker([39.77, -105.23]).bindPopup("Golden, CO.").addTo(groups.cities);

  L.marker([39.69, -104.85])
    .bindPopup("A restaurant")
    .addTo(groups.restaurants);
  L.marker([39.69, -105.12])
    .bindPopup("A restaurant")
    .addTo(groups.restaurants);

  L.marker([39.79, -104.95]).bindPopup("A dog").addTo(groups.dogs);
  L.marker([39.79, -105.22]).bindPopup("A dog").addTo(groups.dogs);

  L.marker([39.59, -104.75]).bindPopup("A cat").addTo(groups.cats);
  L.marker([39.59, -105.02]).bindPopup("A cat").addTo(groups.cats);

  window.ExampleData = {
    LayerGroups: groups,
    Basemaps: basemaps,
  };
})();
