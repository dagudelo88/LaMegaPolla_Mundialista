#!/usr/bin/env python3
"""
Generador del Reglamento Oficial de La Mega Polla Mundialista 2026
Genera un PDF profesional a partir de REGLAS.md
"""

from fpdf import FPDF
import os

class ReglasPDF(FPDF):
    def __init__(self):
        super().__init__()
        # Intentar usar una fuente que soporte español
        try:
            self.add_font("DejaVu", "", "C:/Windows/Fonts/DejaVuSans.ttf")
            self.add_font("DejaVu", "B", "C:/Windows/Fonts/DejaVuSans-Bold.ttf")
            self.font_family = "DejaVu"
        except:
            self.font_family = "Helvetica"

    def header(self):
        self.set_font(self.font_family, "B", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "La Mega Polla Mundialista 2026 — Reglamento Oficial", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 102, 153)
        self.line(10, 12, 200, 12)
        self.ln(3)

    def footer(self):
        self.set_y(-12)
        self.set_font(self.font_family, "", 8)
        self.set_text_color(128)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")

    def chapter_title(self, title):
        self.set_font(self.font_family, "B", 13)
        self.set_text_color(0, 102, 153)
        self.ln(4)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 102, 153)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
        self.set_text_color(0)

    def chapter_body(self, body):
        self.set_font(self.font_family, "", 10)
        self.set_text_color(30)
        self.multi_cell(0, 5.5, body)
        self.ln(2)

    def bullet(self, text):
        self.set_font(self.font_family, "", 10)
        self.set_text_color(30)
        self.multi_cell(0, 5.5, f"  • {text}")

    def important_box(self, text):
        self.set_fill_color(255, 248, 220)
        self.set_draw_color(200, 150, 0)
        self.set_font(self.font_family, "B", 10)
        self.set_text_color(80, 60, 0)
        self.multi_cell(0, 5.5, text, border=1, fill=True)
        self.ln(3)
        self.set_text_color(0)


def generate_pdf():
    pdf = ReglasPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Portada
    pdf.set_font(pdf.font_family, "B", 22)
    pdf.set_text_color(0, 102, 153)
    pdf.ln(20)
    pdf.cell(0, 12, "REGLAMENTO", ln=True, align="C")
    pdf.set_font(pdf.font_family, "B", 18)
    pdf.cell(0, 10, "La Mega Polla Mundialista 2026", ln=True, align="C")
    pdf.set_font(pdf.font_family, "", 11)
    pdf.set_text_color(80)
    pdf.ln(3)
    pdf.cell(0, 8, "Versión Final • 29 de mayo de 2026", ln=True, align="C")
    pdf.ln(15)

    # Contenido principal
    pdf.chapter_title("1. Objetivo del Juego")
    pdf.chapter_body("El objetivo es acumular la mayor cantidad de puntos posible prediciendo los resultados de los partidos del Mundial de Fútbol 2026, utilizando un sistema de puntuación que premia la precisión y una mecánica de cambios pagos que te permite corregir errores con los puntos que hayas ganado.")

    pdf.chapter_title("2. Participación y Cuenta")
    pdf.bullet("Para participar debes recibir un código de invitación del administrador.")
    pdf.bullet("Al registrarte elegirás un apodo (nickname). Este será tu identidad pública.")
    pdf.bullet("Tu correo electrónico nunca se muestra a otros participantes.")

    pdf.chapter_title("3. Pronóstico Inicial Obligatorio")
    pdf.chapter_body("Antes del inicio del Mundial existe una fecha límite global. En esa fecha debes enviar tu pronóstico completo del torneo (fase de grupos + simulación de llaves hasta el campeón). Este pronóstico inicial es vinculante para varias mecánicas del juego.")

    pdf.important_box("IMPORTANTE: Si no envías tu pronóstico completo antes de la fecha límite, no podrás participar en la competencia de puntos.")

    pdf.chapter_title("4. Sistema de Puntuación (Definitivo)")
    pdf.chapter_body("Por cada partido puedes obtener puntos de la siguiente forma:")

    # Tabla simplificada
    pdf.set_font(pdf.font_family, "B", 9)
    pdf.set_fill_color(0, 102, 153)
    pdf.set_text_color(255)
    pdf.cell(95, 7, "Qué acertaste", 1, 0, "C", True)
    pdf.cell(30, 7, "Grupos", 1, 0, "C", True)
    pdf.cell(30, 7, "Eliminatorias", 1, 1, "C", True)

    pdf.set_font(pdf.font_family, "", 9)
    pdf.set_text_color(0)
    rows = [
        ("Ganador + Marcador exacto", "10 pts", "20 pts"),
        ("Ganador + Marcador diferente", "5 pts", "10 pts"),
        ("Empate (120') + Marcador exacto", "10 pts", "10 pts"),
        ("Empate (120') + Marcador distinto", "5 pts", "5 pts"),
        ("No acertaste ganador ni empate", "0 pts", "0 pts"),
    ]
    for row in rows:
        pdf.cell(95, 6, row[0], 1)
        pdf.cell(30, 6, row[1], 1, 0, "C")
        pdf.cell(30, 6, row[2], 1, 1, "C")

    pdf.set_font(pdf.font_family, "", 8)
    pdf.set_text_color(100)
    pdf.multi_cell(0, 5, "* En eliminatorias: si pronosticas empate, debes indicar qué equipo avanza por penales (cuenta +2 pts extra por avance).")

    pdf.chapter_title("5. Mecánica de Cambios Pagos")
    pdf.bullet("Máximo 1 cambio por día.")
    pdf.bullet("Costo: 3 puntos (fase de grupos) / 9 puntos (a partir de octavos).")
    pdf.bullet("Solo puedes cambiar partidos que aún no se han jugado.")

    pdf.chapter_title("6. Bonus por Jornada: Partido Más Goleador")
    pdf.bullet("Por cada jornada puedes seleccionar un partido como el más goleador.")
    pdf.bullet("Acertar el partido: +3 pts")
    pdf.bullet("Acertar el partido + cantidad exacta de goles: +5 pts")

    pdf.chapter_title("7. Regla de Avance de Equipos")
    pdf.chapter_body("Si en la realidad un equipo que tú pronosticaste no avanza, pierdes la capacidad de seguir puntuando con ese equipo en rondas posteriores.")

    pdf.chapter_title("8. Puntos por Equipos que Avanzan")
    pdf.chapter_body("+2 puntos extras por cada equipo que pronosticaste correctamente que avanzaría a la siguiente fase.")

    pdf.chapter_title("9. Tabla de Posiciones")
    pdf.bullet("Gana quien tenga más puntos acumulados.")
    pdf.bullet("Desempates: mayor cantidad de plenos > fecha de inscripción.")

    pdf.chapter_title("10. Reporte de Errores desde la Aplicación")
    pdf.chapter_body("Si crees que hubo un error en los resultados, un bug o cualquier irregularidad, puedes reportarlo directamente desde la aplicación al administrador. Todas las correcciones quedarán registradas.")

    pdf.chapter_title("11. Distribución del Pool (Premios)")
    pdf.bullet("1er puesto: 70% del pool")
    pdf.bullet("2do puesto: 15% del pool")
    pdf.bullet("3er puesto: 10% del pool")
    pdf.bullet("Administrador: 5% (gastos de la aplicación y administración)")

    pdf.chapter_title("12. Disposiciones Finales")
    pdf.chapter_body("Esta es una competencia entre amigos con fines de entretenimiento. El objetivo principal es divertirse y disfrutar el Mundial.")

    pdf.ln(8)
    pdf.set_font(pdf.font_family, "B", 11)
    pdf.set_text_color(0, 102, 153)
    pdf.cell(0, 8, "¡Que comience La Mega Polla Mundialista 2026!", align="C")

    # Guardar
    output_path = os.path.join(os.path.dirname(__file__), "..", "REGLAS.pdf")
    pdf.output(output_path)
    print(f"PDF generado exitosamente: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_pdf()
