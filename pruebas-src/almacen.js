/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Versión de pruebas: guarda todo lo del móvil con un prefijo propio,
// para no mezclarse nunca con lo que guarda la app de la liga (están en la misma web).
(function(){
  var P = 'acgolfPruebas:';
  var proto = Storage.prototype;
  var g = proto.getItem, s = proto.setItem, r = proto.removeItem;
  proto.getItem = function(k){ return g.call(this, P + k); };
  proto.setItem = function(k, v){ return s.call(this, P + k, v); };
  proto.removeItem = function(k){ return r.call(this, P + k); };
})();
