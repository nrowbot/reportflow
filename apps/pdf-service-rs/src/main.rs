use std::f32::consts::TAU;
use std::net::SocketAddr;

use axum::{http::header, response::IntoResponse, routing::post, Json, Router};
use printpdf::{
    BuiltinFont, Color, Mm, Op, PaintMode, PdfDocument, PdfPage, PdfSaveOptions, Point, Polygon,
    Pt, Rgb, TextItem, WindingOrder,
};
use serde::Deserialize;
use textwrap::wrap;
use thiserror::Error;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

const PAGE_WIDTH_MM: f32 = 215.9; // Letter size
const PAGE_HEIGHT_MM: f32 = 279.4;
const MARGIN_MM: f32 = 18.0;
const PT_TO_MM: f32 = 25.4 / 72.0;
const WRAP_WIDTH: usize = 95;
const SECTION_SPACING: f32 = PT_TO_MM * 5.0;
const KPI_COLUMNS: usize = 2;
const KPI_GAP_MM: f32 = PT_TO_MM * 2.2;

#[derive(Clone, Copy)]
enum TextAlign {
    Left,
    Center,
}

fn rgb(hex: u32) -> Rgb {
    let r = ((hex >> 16) & 0xff) as f32 / 255.0;
    let g = ((hex >> 8) & 0xff) as f32 / 255.0;
    let b = (hex & 0xff) as f32 / 255.0;
    Rgb::new(r, g, b, None)
}

fn approx_text_width(text: &str, font_size: f32) -> f32 {
    let chars = text.chars().count() as f32;
    // Helvetica averages roughly 0.52em per glyph.
    chars * font_size * 0.52 * PT_TO_MM
}

fn chars_for_width(width_mm: f32, font_size: f32) -> usize {
    let avg = font_size * 0.52 * PT_TO_MM;
    if avg <= f32::EPSILON {
        return 40;
    }
    let chars = (width_mm / avg).floor() as usize;
    chars.clamp(24, 120)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PdfPayload {
    client_name: String,
    date: String,
    kpis: Vec<Kpi>,
    questions: Vec<SimpleSection>,
    general_sections: Vec<SimpleSection>,
    summary_details: Vec<SummaryDetail>,
    growth_categories: Vec<GrowthCategory>,
}

#[derive(Deserialize)]
struct Kpi {
    name: String,
    value: f64,
}

#[derive(Deserialize)]
struct SimpleSection {
    title: String,
    text: String,
}

#[derive(Deserialize)]
struct SummaryDetail {
    label: String,
    text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GrowthCategory {
    name: String,
    score: f64,
    confidence: f64,
    scored: u32,
    total: u32,
}

#[derive(Error, Debug)]
enum PdfError {
    #[allow(dead_code)]
    #[error("unable to generate pdf")]
    Generation,
}

impl IntoResponse for PdfError {
    fn into_response(self) -> axum::response::Response {
        axum::response::Response::builder()
            .status(500)
            .body(axum::body::Body::from(self.to_string()))
            .unwrap()
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new().route("/pdf", post(generate_pdf)).layer(cors);
    let addr: SocketAddr = ([127, 0, 0, 1], 4001).into();
    let listener = TcpListener::bind(addr).await?;
    println!("Rust PDF service listening on http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn generate_pdf(Json(payload): Json<PdfPayload>) -> Result<impl IntoResponse, PdfError> {
    let pdf_bytes = build_pdf(&payload)?;
    Ok(axum::response::Response::builder()
        .status(200)
        .header(header::CONTENT_TYPE, "application/pdf")
        .body(axum::body::Body::from(pdf_bytes))
        .unwrap())
}

struct PdfBuilder {
    title: String,
    pages: Vec<PdfPage>,
    current_ops: Vec<Op>,
    page_w: f32,
    page_h: f32,
    margin: f32,
    current_y: f32,
}

impl PdfBuilder {
    fn new(title: &str) -> Self {
        Self {
            title: title.to_string(),
            pages: Vec::new(),
            current_ops: Vec::new(),
            page_w: PAGE_WIDTH_MM,
            page_h: PAGE_HEIGHT_MM,
            margin: MARGIN_MM,
            current_y: MARGIN_MM,
        }
    }

    fn ensure_space(&mut self, needed: f32) {
        if self.current_y + needed > self.page_h - self.margin {
            self.flush_page();
        }
    }

    fn flush_page(&mut self) {
        if self.current_ops.is_empty() {
            self.current_y = self.margin;
            return;
        }
        let ops = std::mem::take(&mut self.current_ops);
        self.pages
            .push(PdfPage::new(Mm(self.page_w), Mm(self.page_h), ops));
        self.current_y = self.margin;
    }

    fn text_line(
        &mut self,
        text: &str,
        font: BuiltinFont,
        font_size: f32,
        color: Color,
        indent: f32,
    ) {
        let line_height = font_size * 1.2 * PT_TO_MM;
        self.ensure_space(line_height);
        self.text_line_raw(text, font, font_size, color, indent);
    }

    fn text_line_raw(
        &mut self,
        text: &str,
        font: BuiltinFont,
        font_size: f32,
        color: Color,
        indent: f32,
    ) {
        let line_height = font_size * 1.2 * PT_TO_MM;
        let y = self.page_h - self.current_y;
        self.current_ops.push(Op::SaveGraphicsState);
        self.current_ops.push(Op::StartTextSection);
        self.current_ops.push(Op::SetFillColor { col: color });
        self.current_ops.push(Op::SetFontSizeBuiltinFont {
            size: Pt(font_size),
            font,
        });
        self.current_ops.push(Op::SetTextCursor {
            pos: Point::new(Mm(self.margin + indent), Mm(y)),
        });
        self.current_ops.push(Op::WriteTextBuiltinFont {
            items: vec![TextItem::Text(clean_text(text))],
            font,
        });
        self.current_ops.push(Op::EndTextSection);
        self.current_ops.push(Op::RestoreGraphicsState);
        self.current_y += line_height;
    }

    fn text_absolute(
        &mut self,
        text: &str,
        font: BuiltinFont,
        font_size: f32,
        color: Color,
        x: f32,
        baseline_y: f32,
    ) {
        self.current_ops.push(Op::SaveGraphicsState);
        self.current_ops.push(Op::StartTextSection);
        self.current_ops.push(Op::SetFillColor { col: color });
        self.current_ops.push(Op::SetFontSizeBuiltinFont {
            size: Pt(font_size),
            font,
        });
        self.current_ops.push(Op::SetTextCursor {
            pos: Point::new(Mm(x), Mm(baseline_y)),
        });
        self.current_ops.push(Op::WriteTextBuiltinFont {
            items: vec![TextItem::Text(clean_text(text))],
            font,
        });
        self.current_ops.push(Op::EndTextSection);
        self.current_ops.push(Op::RestoreGraphicsState);
    }

    fn text_in_box(
        &mut self,
        text: &str,
        font: BuiltinFont,
        font_size: f32,
        color: Color,
        x: f32,
        width: f32,
        baseline_y: f32,
        align: TextAlign,
    ) {
        let mut cursor_x = x;
        if matches!(align, TextAlign::Center) {
            let text_w = approx_text_width(text, font_size).min(width);
            cursor_x = x + (width - text_w) / 2.0;
        }
        self.text_absolute(text, font, font_size, color, cursor_x, baseline_y);
    }

    fn wrapped_paragraph(&mut self, text: &str, font_size: f32, max_chars: usize) {
        let normalized = clean_text(text);
        for line in wrap(&normalized, max_chars) {
            self.text_line(
                &line,
                BuiltinFont::Helvetica,
                font_size,
                Color::Rgb(Rgb::new(0.1, 0.1, 0.1, None)),
                0.0,
            );
        }
        self.current_y += PT_TO_MM * 2.0;
    }

    fn section_heading(&mut self, text: &str) {
        self.current_y += PT_TO_MM * 1.5;
        self.text_line(
            text,
            BuiltinFont::HelveticaBold,
            13.0,
            Color::Rgb(Rgb::new(0.08, 0.09, 0.09, None)),
            0.0,
        );
        self.current_y += PT_TO_MM * 0.8;
    }

    fn draw_gradient_fill(&mut self, x_start: f32, fill_width: f32, top: f32, height: f32) {
        let segments = 80.max((fill_width / 1.5) as i32) as usize;
        let segment_width = fill_width / segments.max(1) as f32;
        for i in 0..segments {
            let raw_start = x_start + i as f32 * segment_width - 0.08;
            let start = raw_start.max(x_start);
            if start > x_start + fill_width {
                break;
            }
            let remaining = x_start + fill_width - start;
            if remaining <= 0.0 {
                break;
            }
            let width = (segment_width + 0.12).min(remaining);
            let center = start + width / 2.0;
            let local_ratio = ((center - x_start) / fill_width).clamp(0.0, 1.0);
            self.draw_rect(start, top, width, height, gradient_color(local_ratio));
        }
    }

    fn draw_progress_bar_inline(
        &mut self,
        x_start: f32,
        top: f32,
        width: f32,
        height: f32,
        value: f64,
        track_color: Rgb,
    ) {
        self.draw_rect(x_start, top, width, height, track_color);
        let fill_ratio = (value / 100.0).clamp(0.0, 1.0) as f32;
        let fill_width = width * fill_ratio;
        if fill_width > 0.2 {
            self.draw_gradient_fill(x_start, fill_width, top, height);
        }
    }

    fn draw_line(&mut self, x: f32, top: f32, width: f32, thickness: f32, color: Rgb) {
        self.draw_rect(x, top, width, thickness, color);
    }

    fn draw_circle(&mut self, cx: f32, cy: f32, radius: f32, color: Rgb) {
        let steps = 24;
        let mut points = Vec::with_capacity(steps);
        for i in 0..steps {
            let angle = TAU * (i as f32) / steps as f32;
            let px = cx + radius * angle.cos();
            let py = cy + radius * angle.sin();
            points.push((Point::new(Mm(px), Mm(py)), false));
        }
        let mut polygon = Polygon::from_iter(points);
        polygon.mode = PaintMode::Fill;
        polygon.winding_order = WindingOrder::NonZero;
        self.current_ops.push(Op::SaveGraphicsState);
        self.current_ops.push(Op::SetFillColor {
            col: Color::Rgb(color),
        });
        self.current_ops.push(Op::DrawPolygon { polygon });
        self.current_ops.push(Op::RestoreGraphicsState);
    }

    fn draw_kpi_grid(&mut self, kpis: &[Kpi]) {
        if kpis.is_empty() {
            return;
        }
        let columns = KPI_COLUMNS.max(1);
        let available = self.page_w - 2.0 * self.margin;
        let column_gap = KPI_GAP_MM;
        let card_width =
            (available - column_gap * (columns as f32 - 1.0)).max(40.0) / columns as f32;
        let padding = PT_TO_MM * 1.6;
        let bar_height = 5.0;
        let title_size = 11.0;
        let title_height = title_size * 1.2 * PT_TO_MM;
        let gap = PT_TO_MM * 0.5;
        let card_height = padding * 2.0 + title_height + gap + bar_height;
        let row_gap = PT_TO_MM * 1.6;

        for chunk in kpis.chunks(columns) {
            self.ensure_space(card_height + row_gap);
            let top = self.page_h - self.current_y;
            for (col, kpi) in chunk.iter().enumerate() {
                let x = self.margin + col as f32 * (card_width + column_gap);
                self.draw_rect(x, top, card_width, card_height, rgb(0xf8fafc));
                let title_baseline = top - padding - title_size * 0.25 * PT_TO_MM;
                self.text_absolute(
                    &kpi.name,
                    BuiltinFont::HelveticaBold,
                    title_size,
                    Color::Rgb(rgb(0x111111)),
                    x + padding,
                    title_baseline,
                );
                let bar_top = top - padding - title_height - gap / 2.0;
                let bar_width = card_width - 2.0 * padding;
                self.draw_progress_bar_inline(
                    x + padding,
                    bar_top,
                    bar_width,
                    bar_height,
                    kpi.value,
                    rgb(0xe2e8f0),
                );
            }
            self.current_y += card_height + row_gap;
        }
        self.current_y += PT_TO_MM * 0.8;
    }

    fn draw_question_card(&mut self, section: &SimpleSection) {
        let padding = PT_TO_MM * 1.4;
        let gap = PT_TO_MM * 0.4;
        let title_size = 11.0;
        let body_size = 10.0;
        let title_height = title_size * 1.2 * PT_TO_MM;
        let wrap_width = WRAP_WIDTH.saturating_sub(8).max(40);
        let normalized = clean_text(&section.text);
        let lines: Vec<String> = if normalized.trim().is_empty() {
            vec![String::new()]
        } else {
            wrap(&normalized, wrap_width)
                .into_iter()
                .map(|line| line.into_owned())
                .collect()
        };
        let body_line_height = body_size * 1.25 * PT_TO_MM;
        let body_height = lines.len().max(1) as f32 * body_line_height;
        let block_height = padding * 2.0 + title_height + gap + body_height;
        self.ensure_space(block_height);
        let width = self.page_w - 2.0 * self.margin;
        let top = self.page_h - self.current_y;
        self.draw_rect(self.margin, top, width, block_height, rgb(0xf8fafc));
        self.current_y += padding;
        self.text_line_raw(
            &section.title,
            BuiltinFont::HelveticaBold,
            title_size,
            Color::Rgb(rgb(0x111111)),
            padding,
        );
        self.current_y += gap;
        for line in lines {
            self.text_line_raw(
                &line,
                BuiltinFont::Helvetica,
                body_size,
                Color::Rgb(rgb(0x111111)),
                padding,
            );
        }
        self.current_y += padding;
        self.current_y += PT_TO_MM * 0.8;
    }

    fn draw_category_table(&mut self, categories: &[GrowthCategory]) {
        if categories.is_empty() {
            return;
        }
        let table_width = self.page_w - 2.0 * self.margin;
        let col_fracs = [0.36_f32, 0.28, 0.16, 0.20];
        let col_widths: Vec<f32> = col_fracs.iter().map(|frac| table_width * frac).collect();
        let col_starts: Vec<f32> = {
            let mut acc = self.margin;
            let mut starts = Vec::with_capacity(col_fracs.len());
            for frac in col_fracs {
                starts.push(acc);
                acc += table_width * frac;
            }
            starts
        };
        let header_height = PT_TO_MM * 5.0;
        let row_height = PT_TO_MM * 6.0;
        let padding = PT_TO_MM * 0.9;

        self.ensure_space(header_height + categories.len() as f32 * row_height + PT_TO_MM * 1.5);

        let mut top = self.page_h - self.current_y;
        self.draw_rect(self.margin, top, table_width, header_height, rgb(0xf8fafc));
        let headers = ["Category", "Score", "Confidence", "KPIs Scored"];
        for ((start, width), label) in col_starts.iter().zip(&col_widths).zip(headers.iter()) {
            let baseline = top - padding;
            self.text_in_box(
                label,
                BuiltinFont::HelveticaBold,
                10.0,
                Color::Rgb(rgb(0x111111)),
                *start + padding * 0.5,
                *width - padding,
                baseline,
                if *label == "Category" {
                    TextAlign::Left
                } else {
                    TextAlign::Center
                },
            );
        }
        self.current_y += header_height;

        for cat in categories {
            self.ensure_space(row_height + PT_TO_MM * 0.2);
            top = self.page_h - self.current_y;
            let baseline = top - padding;

            self.text_in_box(
                &cat.name,
                BuiltinFont::HelveticaBold,
                10.5,
                Color::Rgb(rgb(0x111111)),
                col_starts[0] + padding * 0.5,
                col_widths[0] - padding,
                baseline,
                TextAlign::Left,
            );

            let bar_x = col_starts[1] + padding * 0.5;
            let bar_width = (col_widths[1] - padding).max(16.0);
            let bar_top = top - padding * 1.2;
            self.draw_progress_bar_inline(bar_x, bar_top, bar_width, 4.0, cat.score, rgb(0xe2e8f0));

            let confidence_text = format!("{:.0}%", cat.confidence);
            self.text_in_box(
                &confidence_text,
                BuiltinFont::Helvetica,
                10.0,
                Color::Rgb(rgb(0x111111)),
                col_starts[2],
                col_widths[2],
                baseline,
                TextAlign::Center,
            );

            let kpi_text = format!("{} of {}", cat.scored, cat.total);
            self.text_in_box(
                &kpi_text,
                BuiltinFont::Helvetica,
                10.0,
                Color::Rgb(rgb(0x111111)),
                col_starts[3],
                col_widths[3],
                baseline,
                TextAlign::Center,
            );

            let line_y = top - row_height;
            self.draw_line(self.margin, line_y + 0.2, table_width, 0.2, rgb(0xe2e8f0));
            self.current_y += row_height;
        }
        self.current_y += PT_TO_MM * 1.0;
    }

    fn draw_summary_list(&mut self, details: &[SummaryDetail]) {
        if details.is_empty() {
            return;
        }
        let padding = PT_TO_MM * 0.8;
        let badge_diameter = 13.0;
        let badge_radius = badge_diameter / 2.0;
        let text_font = BuiltinFont::Helvetica;
        let font_size = 10.0;
        let line_height = font_size * 1.25 * PT_TO_MM;
        let row_gap = PT_TO_MM * 0.6;
        let content_width = self.page_w - 2.0 * self.margin;

        for detail in details {
            let text_start_x = self.margin + badge_diameter + padding * 2.0;
            let text_width = content_width - (text_start_x - self.margin) - padding;
            let wrap_chars = chars_for_width(text_width, font_size);
            let normalized = clean_text(&detail.text);
            let lines: Vec<String> = wrap(&normalized, wrap_chars)
                .into_iter()
                .map(|l| l.into_owned())
                .collect();
            let content_height = lines.len().max(1) as f32 * line_height;
            let block_height = (content_height + padding * 2.0).max(badge_diameter + padding * 1.6);
            let total_height = block_height + row_gap;

            self.ensure_space(total_height);
            let top = self.page_h - self.current_y;
            let bottom = top - total_height;

            self.draw_line(self.margin, bottom, content_width, 0.25, rgb(0xe2e8f0));

            let badge_cx = self.margin + padding + badge_radius;
            let badge_cy = top - total_height + block_height / 2.0;
            self.draw_circle(badge_cx, badge_cy, badge_radius, rgb(0xd1fae5));
            let label_trimmed = detail.label.trim();
            let badge_text = if label_trimmed.is_empty() {
                "•"
            } else {
                label_trimmed
            };
            self.text_in_box(
                badge_text,
                BuiltinFont::HelveticaBold,
                11.0,
                Color::Rgb(rgb(0x047857)),
                badge_cx - badge_radius,
                badge_diameter,
                badge_cy + 1.5,
                TextAlign::Center,
            );

            let mut baseline = top - padding - font_size * 0.2 * PT_TO_MM;
            for line in lines {
                self.text_absolute(
                    &line,
                    text_font,
                    font_size,
                    Color::Rgb(rgb(0x111111)),
                    text_start_x,
                    baseline,
                );
                baseline -= line_height;
            }
            self.current_y += total_height;
        }
        self.current_y += PT_TO_MM * 0.8;
    }

    fn draw_rect(&mut self, x: f32, top: f32, width: f32, height: f32, color: Rgb) {
        let points = vec![
            (Point::new(Mm(x), Mm(top)), false),
            (Point::new(Mm(x + width), Mm(top)), false),
            (Point::new(Mm(x + width), Mm(top - height)), false),
            (Point::new(Mm(x), Mm(top - height)), false),
        ];
        let mut polygon = Polygon::from_iter(points);
        polygon.mode = PaintMode::Fill;
        polygon.winding_order = WindingOrder::NonZero;
        self.current_ops.push(Op::SaveGraphicsState);
        self.current_ops.push(Op::SetFillColor {
            col: Color::Rgb(color),
        });
        self.current_ops.push(Op::DrawPolygon { polygon });
        self.current_ops.push(Op::RestoreGraphicsState);
    }

    fn finish(mut self) -> Result<Vec<u8>, PdfError> {
        self.flush_page();
        if self.pages.is_empty() {
            self.pages
                .push(PdfPage::new(Mm(self.page_w), Mm(self.page_h), Vec::new()));
        }
        let mut doc = PdfDocument::new(&self.title);
        let mut warnings = Vec::new();
        let bytes = doc
            .with_pages(self.pages)
            .save(&PdfSaveOptions::default(), &mut warnings);
        Ok(bytes)
    }
}

fn gradient_color(t: f32) -> Rgb {
    let start = (0.973, 0.286, 0.286);
    let mid = (0.996, 0.863, 0.309);
    let end = (0.188, 0.741, 0.494);
    let (r, g, b) = if t < 0.5 {
        let local = t / 0.5;
        (
            start.0 + (mid.0 - start.0) * local,
            start.1 + (mid.1 - start.1) * local,
            start.2 + (mid.2 - start.2) * local,
        )
    } else {
        let local = (t - 0.5) / 0.5;
        (
            mid.0 + (end.0 - mid.0) * local,
            mid.1 + (end.1 - mid.1) * local,
            mid.2 + (end.2 - mid.2) * local,
        )
    };
    Rgb::new(r as f32, g as f32, b as f32, None)
}

fn clean_text(input: &str) -> String {
    input
        .replace('“', "\"")
        .replace('”', "\"")
        .replace('’', "'")
        .replace('–', "-")
        .replace('—', "-")
}

fn build_pdf(payload: &PdfPayload) -> Result<Vec<u8>, PdfError> {
    let mut builder = PdfBuilder::new(&format!("{} — Summary", payload.client_name));

    builder.text_line(
        &format!("{} — Online Analysis", payload.client_name),
        BuiltinFont::HelveticaBold,
        18.0,
        Color::Rgb(rgb(0x111111)),
        0.0,
    );
    builder.text_line(
        &payload.date,
        BuiltinFont::Helvetica,
        11.0,
        Color::Rgb(rgb(0x4b5563)),
        0.0,
    );
    builder.current_y += PT_TO_MM * 3.0;

    if !payload.kpis.is_empty() {
        builder.section_heading("Key KPIs");
        builder.draw_kpi_grid(&payload.kpis);
        builder.current_y += SECTION_SPACING * 0.5;
    }

    if !payload.questions.is_empty() {
        builder.section_heading("Key Questions");
        for section in &payload.questions {
            builder.draw_question_card(section);
        }
        builder.current_y += SECTION_SPACING;
    }

    if !payload.growth_categories.is_empty() {
        builder.section_heading("Breakdown by Category");
        builder.draw_category_table(&payload.growth_categories);
        builder.current_y += SECTION_SPACING;
    }

    if !payload.summary_details.is_empty() {
        builder.section_heading("Summary Details");
        builder.draw_summary_list(&payload.summary_details);
        builder.current_y += SECTION_SPACING * 0.75;
    }

    if !payload.general_sections.is_empty() {
        builder.section_heading("Additional Insights");
        for section in &payload.general_sections {
            builder.text_line(
                &section.title,
                BuiltinFont::HelveticaBold,
                11.5,
                Color::Rgb(Rgb::new(0.12, 0.12, 0.12, None)),
                0.0,
            );
            builder.wrapped_paragraph(&section.text, 10.0, WRAP_WIDTH);
        }
        builder.current_y += SECTION_SPACING;
    }

    builder.wrapped_paragraph(
        "Learn more about GROWTH Practice Optimization Partnership, the new Zero Risk way to win in dentistry!",
        10.5,
        WRAP_WIDTH,
    );
    builder.wrapped_paragraph(
        "\"We love helping practices double their profitability risk free without having to come up with money out of their pocket. It's a game changer for the practice and unbelievably fulfilling for our team, for practices that qualify.\" Shawn Rowbotham",
        10.5,
        WRAP_WIDTH,
    );

    builder.finish()
}
