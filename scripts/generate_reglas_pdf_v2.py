#!/usr/bin/env python3
"""
Generador oficial del Reglamento de La Mega Polla Mundialista 2026
Versión que usa el contenido completo de REGLAS.md
"""

from fpdf import FPDF
import os
import re

# Contenido completo del reglamento (extraído de REGLAS.md)
REGLAMENTO = """# Reglamento de La Mega Polla Mundialista 2026

**Versión Final**  
**Fecha**: 29 de mayo de 2026

Bienvenido a **La Mega Polla Mundialista 2026**.  
Este es un juego privado entre amigos para disfrutar el Mundial de una forma más estratégica, divertida y competitiva.

## 1. Objetivo del Juego

El objetivo es acumular la mayor cantidad de puntos posible prediciendo los resultados de los partidos del Mundial de Fútbol 2026, utilizando un sistema de puntuación que premia la precisión y una mecánica de cambios pagos que te permite corregir errores con los puntos que hayas ganado.

## 2. Participación y Cuenta

- Para participar debes recibir un **código de invitación** del administrador.
- Al registrarte elegirás un **apodo (nickname)**. Este será tu identidad pública en la polla (en la tabla de posiciones, en los pronósticos, etc.).
- Tu correo electrónico nunca se muestra a otros participantes.

## 3. Pronóstico Inicial Obligatorio

Antes del inicio del Mundial existe una **fecha límite global**.

En esa fecha debes enviar tu **pronóstico completo** del torneo, que incluye:

- El resultado exacto de los 72 partidos de la fase de grupos.
- Tu simulación completa de llaves (qué equipos avanzan en cada ronda hasta el campeón).

**Importante**: Este pronóstico inicial es vinculante para varias mecánicas del juego (ver Regla de Avance de Equipos).

Si no envías tu pronóstico completo antes de la fecha límite, no podrás participar en la competencia de puntos.

## 4. Sistema de Puntuación (Definitivo)

Por cada partido puedes obtener puntos de la siguiente forma:

| Qué acertaste                                              | Fase de Grupos | Fases de Eliminación |
|------------------------------------------------------------|----------------|----------------------|
| **Ganador + Marcador exacto**                              | **10 pts**     | **20 pts**           |
| **Ganador + Marcador diferente**                           | **5 pts**      | **10 pts**           |
| **Empate (después de 120') + Marcador exacto**             | **10 pts**     | **10 pts**           |
| **Empate (después de 120') + Marcador distinto**           | **5 pts**      | **5 pts**            |
| **No acertaste ganador ni empate**                         | **0 pts**      | **0 pts**            |

**Máximo por partido**: 10 puntos (grupos) / 20 puntos (eliminatorias).

**Nota**: Solo cuentan los 90 minutos reglamentarios + tiempo de reposición. No se toman en cuenta tiempos extras ni penales.

### Regla Especial de Fases de Eliminación

En las fases de eliminación (octavos, cuartos, semifinales, tercer puesto y final) **sí es válido pronosticar empate** cuando el partido termina empatado después de los 120 minutos y se define en penales.

- El marcador que cuenta para los puntos es el resultado **después de 120 minutos** (90 reglamentarios + 30 de alargue).
- Si predices empate y aciertas el resultado después de 120 minutos (con marcador exacto o no), recibes **10 o 5 puntos** respectivamente.
- **Obligatorio**: Si pronosticas empate, **debes indicar qué equipo crees que avanzará** en la tanda de penales.
- El equipo que pronostiques como ganador en penales cuenta para los **2 puntos extras por equipo que avanza correctamente**.

**Resumen para eliminatorias**:
- Predicción de **ganador** (sin empate): 20 pts (marcador exacto) o 10 pts (ganador correcto).
- Predicción de **empate** (después de 120'): 10 pts (marcador exacto) o 5 pts (empate correcto).
- En ambos casos, el equipo que pronostiques que **avanza** suma **+2 puntos extras** si aciertas.

## 5. Mecánica de Cambios Pagos

Una vez que el torneo comienza, tus pronósticos quedan bloqueados.

Sin embargo, puedes **gastar puntos** para modificar pronósticos de partidos que aún no se han jugado, con las siguientes reglas:

- Puedes realizar **máximo 1 cambio por día**.
- El costo es de **3 puntos** por cambio en fase de grupos.
- A partir de Octavos de Final, el costo **se triplica** a **9 puntos** por cambio.
- Los cambios solo se pueden hacer antes de que comience el partido.

Esta mecánica te permite corregir errores, pero te penaliza por hacerlo (especialmente en las rondas finales).

## 6. Bonus por Jornada: Partido Más Goleador

Por cada jornada puedes seleccionar **un solo partido** como "el que más goles va a tener sumados los dos equipos".

- Si aciertas **qué partido** será el más goleador de la jornada → **+3 puntos**.
- Si además aciertas la **cantidad exacta de goles totales** de ese partido → **+5 puntos** (en lugar de 3).

Debes realizar esta selección antes de que empiece el primer partido de la jornada.

## 7. Regla de Avance de Equipos (Importante)

Cuando envías tu pronóstico inicial, también defines qué equipos "sigues" en tu simulación personal.

- Si en la realidad un equipo que tú pronosticaste **no avanza**, **pierdes la capacidad de seguir puntuando** en los partidos que ese equipo habría jugado según tu bracket.
- Solo puedes seguir haciendo pronósticos y ganando puntos con los equipos que **tú mismo pronosticaste** que llegarían a esa ronda.
- Si tu pronóstico de avance fue muy inexacto, es posible que te quedes sin equipos en fases avanzadas y ya no puedas sumar más puntos.

Esta regla premia fuertemente la calidad de tu pronóstico inicial de llaves.

### Puntos por Equipos que Avanzan Correctamente

Además de los puntos por partido, al final de cada ronda obtendrás **2 puntos extras por cada equipo** que tú pronosticaste correctamente que avanzaría a la siguiente fase.

Ejemplo: Si en tu bracket inicial pronosticaste que Argentina, Brasil, Francia y España llegarían a cuartos, y en realidad llegaron Argentina, Brasil, Francia y Países Bajos, recibirás **6 puntos extras** (3 equipos correctos × 2 pts).

## 8. Tabla de Posiciones y Desempates

Gana quien tenga más puntos acumulados al final del Mundial.

En caso de empate se aplican los siguientes criterios, en orden:

1. Mayor cantidad de plenos (10 o 20 puntos en un partido).
2. Fecha de inscripción (quien se unió primero).

## 9. Roles

### Participante
- Realiza pronósticos y cambios.
- Ve los pronósticos de los demás participantes.
- Recibe puntos por aciertos y bonos.
- Puede reportar problemas desde la aplicación.

### Administrador
Además de participar, puede:
- Generar y gestionar códigos de invitación.
- Cargar los resultados reales de los partidos.
- Corregir pronósticos de cualquier usuario (solo en caso de errores o bugs).
- Gestionar la competencia en general.

## 10. Reporte de Errores y Bugs desde la Aplicación

Si crees que hubo un error en los resultados cargados, un problema con tu puntuación, un bug en la aplicación o cualquier situación irregular:

- Desde la aplicación puedes **reportar el problema** directamente al administrador.
- El reporte debe incluir una descripción clara de lo que sucedió.
- El administrador revisará el caso y tomará las acciones necesarias (puede corregir resultados o pronósticos cuando corresponda).
- Todas las correcciones realizadas por el administrador quedarán registradas y, cuando aplique, se te notificará.

**Nunca** se modificarán resultados ni pronósticos sin que exista un reporte o una justificación clara.

## 11. Privacidad

- Tu correo electrónico nunca es visible para otros participantes.
- Solo tu apodo (nickname) aparece públicamente.
- Puedes cambiar tu apodo en cualquier momento mientras sea único.

## 12. Distribución del Pool (Premios)

Al final del Mundial, el fondo acumulado (pool) se distribuirá de la siguiente manera:

- **1er puesto**: 70% del pool
- **2do puesto**: 15% del pool
- **3er puesto**: 10% del pool
- **Administrador**: 5% del pool (destinado a cubrir gastos de la aplicación, inteligencia artificial y administración)

El administrador será el encargado de recolectar las contribuciones y realizar los pagos a los ganadores una vez finalizado el torneo.

## 13. Disposiciones Finales

- Esta es una competencia entre amigos con fines de entretenimiento.
- El administrador tiene la autoridad final para resolver cualquier situación no contemplada en este reglamento.
- El objetivo principal es divertirse y disfrutar el Mundial.

---

**¡Que comience La Mega Polla Mundialista 2026!**

Que gane el más preciso… o el que mejor aproveche sus puntos para corregir a tiempo.

---

*Versión final del reglamento – Sujeto a ajustes menores por parte del administrador antes del inicio del torneo.*
"""

def create_pdf():
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Usar Helvetica (soporta español básico)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Reglamento de La Mega Polla Mundialista 2026", ln=True, align="C")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, "Version Final - 29 de mayo de 2026", ln=True, align="C")
    pdf.ln(4)

    # Procesar el contenido línea por línea
    lines = REGLAMENTO.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            pdf.ln(1)
            continue

        if line.startswith("### "):
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(0, 102, 153)
            pdf.ln(2)
            pdf.cell(0, 6, line[4:], ln=True)
            pdf.set_text_color(0)
        elif line.startswith("## "):
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(0, 102, 153)
            pdf.ln(3)
            pdf.cell(0, 7, line[3:], ln=True)
            pdf.set_draw_color(0, 102, 153)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)
            pdf.set_text_color(0)
        elif line.startswith("# "):
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(0, 102, 153)
            pdf.ln(2)
            pdf.cell(0, 8, line[2:], ln=True, align="C")
            pdf.set_text_color(0)
        elif line.startswith("**") and line.endswith("**"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.multi_cell(0, 5, line.replace("**", ""))
        elif line.startswith("- "):
            pdf.set_font("Helvetica", "", 9)
            pdf.multi_cell(0, 5, "  - " + line[2:])
        elif line.startswith("|"):
            # Saltar tablas (se representan de forma simplificada)
            continue
        elif line.startswith("---"):
            pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "", 9)
            # Limpiar markdown básico
            clean = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
            clean = re.sub(r'\*(.+?)\*', r'\1', clean)
            pdf.multi_cell(0, 5, clean)

    output = os.path.join(os.path.dirname(__file__), "..", "REGLAS.pdf")
    pdf.output(output)
    print(f"PDF generado: {output}")
    return output

if __name__ == "__main__":
    create_pdf()
