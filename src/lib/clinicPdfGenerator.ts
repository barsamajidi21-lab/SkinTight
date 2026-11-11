import { jsPDF } from 'jspdf';
import { Clinic, ClinicCase } from '../types/clinic';
import { resolvePhotoUrl } from '../App';

export async function generateClinicCasePDF(clinicCase: ClinicCase, clinic: Clinic): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pw = doc.internal.pageSize.getWidth(); // 210mm
  
  const rawPhotos = clinicCase.photos || [];
  const resolvedPhotos = await Promise.all(rawPhotos.map(p => resolvePhotoUrl(p)));
  const photos = resolvedPhotos.filter(Boolean);

  const activeColor = clinicCase.override?.overriddenColor || clinicCase.color;
  const isOverridden = !!clinicCase.override;

  // Header Banner (Color-coded based on triage category)
  // Navy background with prominent triage status indicator
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(10, 8, pw - 20, 22, 'F');

  // Clinic Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(clinic.name.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${clinic.address}  |  Tel: ${clinic.phone}`, 14, 20);
  doc.text('CLINICAL PRE-VISIT INTAKE & TRIAGE BRIEF', 14, 25);

  // Triage Category Badge (Top Right of Header)
  const badgeWidth = 44;
  const badgeHeight = 16;
  const badgeX = pw - 14 - badgeWidth;
  const badgeY = 11;

  if (activeColor === 'red') {
    doc.setFillColor(220, 38, 38); // Red
  } else if (activeColor === 'yellow') {
    doc.setFillColor(217, 119, 6); // Amber / Yellow
  } else {
    doc.setFillColor(16, 185, 129); // Green
  }
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const colorLabel = activeColor === 'red' ? 'TRIAGE: RED' : (activeColor === 'yellow' ? 'TRIAGE: YELLOW' : 'TRIAGE: GREEN');
  doc.text(colorLabel, badgeX + badgeWidth / 2, badgeY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const subLabel = isOverridden ? 'OVERRIDDEN BY STAFF' : 'RULE-ASSIGNED';
  doc.text(subLabel, badgeX + badgeWidth / 2, badgeY + 12, { align: 'center' });

  // 1. Patient Demographics & Encounter Info Box (Y: 33 to 53mm)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(10, 33, pw - 20, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('1. PATIENT INTAKE & DEMOGRAPHIC RECORD', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Patient Name: ${clinicCase.patientName}`, 14, 43);
  doc.text(`Contact: ${clinicCase.patientPhone || 'Not provided'}  |  ${clinicCase.patientEmail || 'Not provided'}`, 14, 47.5);
  doc.text(`Submission Date: ${new Date(clinicCase.dateSubmitted).toLocaleString()}`, 14, 51);

  doc.text(`Case ID: #CASE-${clinicCase.id.slice(-8)}`, 110, 43);
  doc.text(`Intake Method: ${clinicCase.isPhoneIntake ? `Phone Script (Staff: ${clinicCase.intakeStaffName || 'Staff'})` : 'Patient Digital Portal'}`, 110, 47.5);
  doc.text(`Status: Pending In-Office Exam`, 110, 51);

  // 2. Triage Rule Justification ("Why" Line) & Physician Approval (Y: 56 to 82mm)
  doc.setFillColor(254, 242, 242);
  if (activeColor === 'yellow') doc.setFillColor(254, 252, 232);
  if (activeColor === 'green') doc.setFillColor(240, 253, 244);
  
  doc.setDrawColor(activeColor === 'red' ? 239 : (activeColor === 'yellow' ? 245 : 16), activeColor === 'red' ? 68 : (activeColor === 'yellow' ? 158 : 185), activeColor === 'red' ? 68 : (activeColor === 'yellow' ? 11 : 129));
  doc.setLineWidth(0.4);
  doc.roundedRect(10, 56, pw - 20, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('2. TRIAGE CATEGORY JUSTIFICATION & AUDIT TRAIL', 14, 61);

  // "Why" Line bullet points
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  
  const whyText = clinicCase.why.length > 0 ? clinicCase.why.map(w => `• ${w}`).join('   ') : '• Standard intake completed without red-flag triggers';
  const splitWhy = doc.splitTextToSize(`Triggered Rule(s): ${whyText}`, pw - 30);
  doc.text(splitWhy.slice(0, 2), 14, 66);

  if (clinicCase.override) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);
    doc.text(`Staff Override Applied: Changed from ${clinicCase.override.originalColor.toUpperCase()} to ${clinicCase.override.overriddenColor.toUpperCase()} by ${clinicCase.override.overriddenBy}. Reason: "${clinicCase.override.reason}"`, 14, 73);
  }

  // Rules approval stamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Scoring Rules Engine: ${clinicCase.rulesVersion} — DRAFT pending physician approval`, 14, 78);

  // 3. Clinical Photos & Structured Lesion Details (Y: 83 to 138mm)
  const imgBoxW = 48;
  const imgBoxH = 46;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 83, imgBoxW, imgBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('ENCOUNTER PHOTO', 10 + imgBoxW / 2, 87.5, { align: 'center' });

  try {
    if (photos[0] && (photos[0].startsWith('data:image') || photos[0].startsWith('http'))) {
      doc.addImage(photos[0], 'JPEG', 12, 90, imgBoxW - 4, imgBoxH - 9);
    } else {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Photo File Archived in', 10 + imgBoxW / 2, 106, { align: 'center' });
      doc.text('Cloud Storage', 10 + imgBoxW / 2, 110, { align: 'center' });
    }
  } catch {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Photo Attached in Storage', 10 + imgBoxW / 2, 108, { align: 'center' });
  }

  // Structured Lesion Questionnaire Details Box (Right of Photo)
  const detailBoxX = 10 + imgBoxW + 4;
  const detailBoxW = pw - 20 - imgBoxW - 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(detailBoxX, 83, detailBoxW, imgBoxH, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. PATIENT-REPORTED CLINICAL SYMPTOMS & TIMELINE', detailBoxX + 4, 88);

  const ans = clinicCase.answers;
  const structuredItems = [
    { label: 'Body Site:', val: `${ans.bodyLocation || 'Not specified'} ${ans.exactBodyLocation ? `(${ans.exactBodyLocation})` : ''}` },
    { label: 'Timeline:', val: `First noticed ${ans.lesionFirstNoticedDate || ans.duration || 'Not specified'} (${ans.newOrChanged || 'Status not specified'})` },
    { label: 'Reported Changes:', val: [ans.colorChange, ans.sizeChange, ans.shapeChange].filter(Boolean).join('; ') || 'No size, shape, or color changes' },
    { label: 'Bleeding / Sore:', val: `Bleeding: ${ans.bleeding || 'None'}  |  Non-healing (>3-4wks): ${ans.nonHealing || 'None'}` },
    { label: 'Sensation:', val: ans.painOrSensation || 'None reported' },
    { label: 'Oncological Hx:', val: `Personal: ${ans.personalCancerHistory || 'None'}  |  Family: ${ans.familyCancerHistory || 'None'}` },
  ];

  structuredItems.forEach((item, idx) => {
    const yPos = 93 + idx * 5.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, detailBoxX + 4, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitVal = doc.splitTextToSize(item.val, detailBoxW - 32);
    doc.text(splitVal[0] || '', detailBoxX + 30, yPos);
  });

  // 4. Pre-Visit Patient-Reported Summary (Y: 132 to 160mm)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 132, pw - 20, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. PRE-VISIT PATIENT SUMMARY (NON-DIAGNOSTIC)', 14, 137);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const summaryWrap = doc.splitTextToSize(clinicCase.patientSummary || 'Patient submitted questionnaire and photos for clinical triage review.', pw - 28);
  doc.text(summaryWrap.slice(0, 3), 14, 142);

  // 5. Provider In-Office Review & Checklist (Y: 160 to 235mm)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.roundedRect(10, 160, pw - 20, 68, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('5. FOR CLINICIAN USE ONLY — IN-OFFICE CLINICAL DISPOSITION', 14, 166);

  // Clean un-checked boxes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('[  ] In-Person Dermoscopy Performed', 14, 172);
  doc.text('[  ] Biopsy Ordered (Punch / Shave / Excision)', 95, 172);
  doc.text('[  ] Routine Photo Follow-up in 3–6 Months', 14, 178);
  doc.text('[  ] Routine Non-Urgent Periodic Follow-Up', 95, 178);
  doc.text('[  ] Referral to Mohs / Surgical Oncology', 14, 184);
  doc.text('[  ] Cryotherapy / Topical Therapy Prescribed', 95, 184);

  // Clinical notes lines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Provider Clinical Assessment & Exam Findings:', 14, 192);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, 198, pw - 14, 198);
  doc.line(14, 204, pw - 14, 204);
  doc.line(14, 210, pw - 14, 210);
  doc.line(14, 216, pw - 14, 216);

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Provider Signature: ____________________________________', 14, 224);
  doc.text('Date Examined: _______________', pw - 65, 224);

  // 6. Mandatory Compliance Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const footerDisclaimer = 'Triage category assigned by clinic-approved rules. Not a diagnosis. Requires clinician review. SkinTight is a clinical workflow and pre-visit documentation platform.';
  doc.text(footerDisclaimer, 10, 240);

  doc.setDrawColor(226, 232, 240);
  doc.line(10, 244, pw - 10, 244);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${clinic.name}  |  Dermatology Triage Engine  |  Standardized Clinical Brief`, 10, 249);
  doc.text('Page 1 of 1', pw - 10, 249, { align: 'right' });

  // Save PDF file
  const fileName = `Clinic_Triage_${clinic.id}_Case_${clinicCase.id.slice(-6)}_${activeColor.toUpperCase()}.pdf`;
  doc.save(fileName);
}
