# Día a Día 0.2.2-alpha

## Novedades

- **Pausas y vacaciones.** En Tareas > Pausas y vacaciones eliges unas fechas y qué tareas pausar. Por defecto se marcan todas; quítale el check a las que quieras seguir haciendo.
  - Lo que está en pausa no se genera, no resta y no rompe la racha.
  - Si dejas alguna tarea activa, esos días cuentan solo con ella.
  - Los días con todo en pausa salen con 🏖️ en el calendario y en el muro de Méritos.
  - Puedes editar la pausa cuando quieras para reactivar tareas, alargarla o quitarla. Al quitarla, los días que ya pasaron siguen marcados como pausa.
- Mientras dura una pausa, Hoy muestra un aviso con hasta cuándo y cuántas tareas están en pausa.
- **Nota del día.** Desde 1 h 30 min antes de tu hora de terminar el día, la app te pregunta qué tal ha ido. Si no lo valoras, te pregunta por el día anterior al abrirla. La nota va de 0 a 10, de medio en medio punto, y se elige arrastrando una barra.
- **"Preguntar más tarde"** pospone la encuesta una hora.
- **Méritos:** nota media de tus días y un botón **Tareas / Notas** en el muro de días. En modo Notas, cada casilla se pinta de rojo a verde según la nota y la muestra dentro.
- Al tocar un día en el calendario o en el muro puedes **poner o cambiar su nota**.

## Arreglos

- **Tareas duplicadas al cambiar de día:** si varias partes de la app pedían el día a la vez (por ejemplo a medianoche), las tareas diarias podían salir dos o tres veces. Ahora el backend atiende las peticiones de una en una.
- **Botón "atrás" de Android:** ya no cierra la app de golpe. Primero cierra la ventana o el menú abierto, después vuelve a Hoy, y desde Hoy sale de la app.
- **La fuente va dentro de la app:** se ve igual aunque no tengas internet.
- **"Hoy te toca…"** ya no pasa a minúsculas los nombres propios ("ir a Correos").
- **Los avisos flotantes se ven por encima de las ventanas** (por ejemplo, si Android deniega el permiso del calendario mientras creas un evento).
- **Borrar un evento u horario pide confirmación**, como las tareas y los premios.
- **Las tareas de una vez aplazadas siguen en la pestaña Tareas** mientras estén pendientes, marcadas como aplazadas.
- **Una tarea con hora elegida a mano que ya pasó** muestra su hora en rojo en vez de "Ahora".
- **El contador "X de Y hechas"** ya no sube el total al hacer una tarea sin fecha; se muestran aparte.
- **El APK pesa unos 650 KB menos:** ya no incluye la base de datos del modo navegador.
- **Las notas de cada release de GitHub** muestran solo las novedades de esa versión.
- Al escribir el nombre de un evento ya no aparece la lista de sugerencias que se veía mal: ahora es un campo de texto normal.
- Las fechas como "Viernes, 2 De Octubre" ahora salen como "Viernes, 2 de octubre".

## Cambios

- **Si pasas varios días sin abrir la app, solo restan los 3 últimos** (antes podían ser hasta 30).
- **Icono:** fondo crema y sin el aro rojo, con el personaje al mismo tamaño.

## Al actualizar

Instala el APK encima de la versión anterior. Tus datos se conservan.

---

# Día a Día 0.2.1-alpha

## Novedades

- **Cambiar la hora de una tarea arrastrando.** En "Tu día", mantén pulsada la hora de una tarea y desliza: hacia abajo la adelanta y hacia arriba la retrasa, de 10 en 10 minutos. Al soltar se guarda y el resto de tareas se recoloca alrededor.
- Las tareas movidas a mano se marcan con 📌. Desde su menú puedes **volver a la hora automática**.
- Las tareas movidas a mano no se reparten a otros días por el límite diario.

## Arreglos

- **"1 hora más tarde" ya funciona bien:** retrasa la tarea una hora desde su hora planificada. Antes contaba desde la hora actual, así que una tarea de la tarde no se movía.

## Al actualizar

Instala el APK encima de la versión anterior. Tus datos se conservan.

---

# Día a Día 0.2.0-alpha

## Novedades

- **Elegir cuándo empieza cada tarea.** Las tareas que se repiten tienen "Empieza el" y no arrancan siempre el día que las creas.
- **Tareas de una sola vez.** Para cosas como ir a Correos: eliges el día y, si quieres, la hora.
- **Tareas sin fecha.** Salen en Hoy, en "Cuando puedas". No restan si pasan los días y suman el día que las haces.
- **Eventos en el calendario.** Pádel, citas, cumpleaños... No dan puntos: ocupan su hora y las tareas se colocan alrededor. Se ven en el calendario del mes y pueden avisarte antes.
- **Tiempo máximo de tareas al día** (Tareas > Ajustes). Si un día se pasa, las tareas flexibles se mueven solas al primer día con hueco de la semana siguiente.
- **Calendario del móvil.** Los eventos y tareas de una vez que marques se añaden a tu calendario de Google (solo de la app al móvil).
- **Botón "Nueva tarea" en Hoy** para apuntar rápido lo que va surgiendo.
- La versión se muestra al final de Ajustes.

## Al actualizar

Instala el APK encima de la versión anterior. La base de datos se actualiza sola y conserva tus tareas, puntos e historial.
