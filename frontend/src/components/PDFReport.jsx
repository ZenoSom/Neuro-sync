import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Using default Helvetica font to avoid network 404 errors

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FAFAFA',
    padding: 40
  },
  headerBand: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    color: '#FFFFFF'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 900,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  headerCol: {
    flexDirection: 'column'
  },
  headerLabel: {
    fontSize: 8,
    color: '#94A3B8',
    textTransform: 'uppercase'
  },
  headerValue: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: '#0F172A',
    textTransform: 'uppercase',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 15
  },
  largeResult: {
    alignItems: 'center',
    padding: 25
  },
  levelText: {
    fontSize: 32,
    fontWeight: 900,
    textTransform: 'uppercase',
    marginBottom: 10
  },
  levelLow: { color: '#10B981' },
  levelModerate: { color: '#F59E0B' },
  levelElevated: { color: '#F43F5E' },
  gaugeContainer: {
    width: 300,
    height: 12,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 15
  },
  gaugeSegLow: { flex: 1, backgroundColor: '#D1FAE5' },
  gaugeSegMod: { flex: 1, backgroundColor: '#FEF3C7' },
  gaugeSegElev: { flex: 1, backgroundColor: '#FFE4E6' },
  markerBase: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#0F172A',
    borderRadius: 2
  },
  resultDesc: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.5,
    maxWidth: 400
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  smallCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 15
  },
  smallCardTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase'
  },
  smallCardValue: {
    fontSize: 18,
    fontWeight: 900,
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 8
  },
  barContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    position: 'relative'
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
    borderRadius: 3
  },
  barThreshold: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: '#F43F5E'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: 700
  },
  disclaimerBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 10
  },
  disclaimerText: {
    fontSize: 9,
    color: '#BE123C',
    fontWeight: 700,
    lineHeight: 1.4
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10
  },
  heatmapCell: {
    width: '15.6%', // Roughly 6 per row
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  heatmapText: {
    fontSize: 12,
    fontWeight: 900,
    color: '#0F172A'
  },
  heatmapLabel: {
    fontSize: 6,
    color: '#64748B',
    textTransform: 'uppercase'
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  tableHeader: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    fontSize: 9,
    fontWeight: 700,
    color: '#475569',
    flex: 1
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
    color: '#0F172A',
    flex: 1
  },
  textParagraph: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: 10
  }
});

// Helper for answer colors
const getAnswerColor = (val) => {
  if (val === null || val === undefined) return '#F8FAFC';
  if (val === 0) return '#F8FAFC';
  if (val === 1) return '#E0F2FE';
  if (val === 2) return '#BAE6FD';
  if (val === 3) return '#FEF08A';
  if (val === 4) return '#FECACA';
  return '#F8FAFC';
};

const getAnswerLabel = (val) => {
  if (val === 0) return 'Never';
  if (val === 1) return 'Rarely';
  if (val === 2) return 'Sometimes';
  if (val === 3) return 'Often';
  if (val === 4) return 'Very Often';
  return 'N/A';
};

// Line chart approximation using absolute positioning
const LineChart = ({ data = [], width = 400, height = 100 }) => {
  if (!data || data.length === 0) return <Text style={{fontSize:10}}>No data</Text>;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  return (
    <View style={{ width, height, backgroundColor: '#F8FAFC', borderRadius: 4, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
      {data.map((val, i) => {
        const x = (i / Math.max(1, data.length - 1)) * (width - 10) + 5;
        const y = height - ((val - min) / range) * (height - 20) - 10;
        return (
          <View key={i} style={{ position: 'absolute', left: x - 2, top: y - 2, width: 4, height: 4, backgroundColor: '#6366F1', borderRadius: 2 }} />
        );
      })}
    </View>
  );
};

export const PDFReport = ({ result, inputData, includeJournal = false }) => {
  const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  // Severity logic
  let levelStr = "Low";
  let levelStyle = styles.levelLow;
  let gaugeMarkerPos = "16.6%"; // Middle of Low segment
  let desc = "The screening indicates a low presence of traits associated with ADHD.";

  const conf = result.confidence || 0;
  if (conf >= 0.7) {
    levelStr = "Elevated";
    levelStyle = styles.levelElevated;
    gaugeMarkerPos = "83.3%"; // Middle of Elevated segment
    desc = "The screening indicates an elevated presence of traits commonly associated with ADHD. It is recommended to discuss these findings with a qualified healthcare provider.";
  } else if (conf >= 0.4) {
    levelStr = "Moderate";
    levelStyle = styles.levelModerate;
    gaugeMarkerPos = "50%"; // Middle of Moderate
    desc = "The screening indicates a moderate presence of traits associated with ADHD. Consider monitoring these traits and how they impact daily life.";
  }

  // Calculate ASRS values
  const partA = result.behavioral_scores?.part_a_score || 0; 
  const partB = result.behavioral_scores?.part_b_score || 0;
  const partA_pct = Math.min(100, (partA / 36) * 100);
  const partB_pct = Math.min(100, (partB / 36) * 100);

  // Game metrics
  const hasGame = !!inputData.quiz_attempted;
  const gameRisk = Math.round((result.behavioral_scores?.quiz_score || 0) * 100);
  
  // NLP metrics
  const hasText = !!inputData.journal_text;
  const textRisk = Math.round((result.analysis_details?.text_proba || 0) * 100);

  const Footer = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>NeuroSync v2.1 | Report ID: {reportId}</Text>
      <Text style={styles.footerText}>Screening only. Not a diagnosis. Not validated against clinical assessments. Does not replace a doctor or psychologist.</Text>
    </View>
  );

  return (
    <Document>
      {/* PAGE 1: SUMMARY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.headerTitle}>ADHD Traits Screening Summary</Text>
          <Text style={styles.headerSubtitle}>Automated Pattern Recognition Output</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerCol}><Text style={styles.headerLabel}>Participant</Text><Text style={styles.headerValue}>Age {inputData.age}, {inputData.gender}</Text></View>
            <View style={styles.headerCol}><Text style={styles.headerLabel}>Education</Text><Text style={styles.headerValue}>{inputData.education}</Text></View>
            <View style={styles.headerCol}><Text style={styles.headerLabel}>Report Date</Text><Text style={styles.headerValue}>{dateStr}</Text></View>
            <View style={styles.headerCol}><Text style={styles.headerLabel}>Report ID</Text><Text style={styles.headerValue}>{reportId}</Text></View>
          </View>
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>SAFETY NOTICE: This is an automated screening tool designed to highlight behavioral patterns and cognitive indicators. It is NOT a medical diagnosis, has not been validated against formal clinical assessments, and cannot replace a professional evaluation by a doctor or psychologist.</Text>
        </View>

        <Text style={styles.sectionTitle}>Overall Indicator Level</Text>
        <View style={[styles.card, styles.largeResult]}>
          <Text style={[styles.levelText, levelStyle]}>{levelStr}</Text>
          
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeSegLow} />
            <View style={styles.gaugeSegMod} />
            <View style={styles.gaugeSegElev} />
            <View style={[styles.markerBase, { left: gaugeMarkerPos }]} />
          </View>
          <View style={{flexDirection:'row', width:300, justifyContent:'space-between', marginBottom: 15}}>
             <Text style={{fontSize:8, color:'#64748B'}}>Low</Text>
             <Text style={{fontSize:8, color:'#64748B'}}>Moderate</Text>
             <Text style={{fontSize:8, color:'#64748B'}}>Elevated</Text>
          </View>
          
          <Text style={styles.resultDesc}>{desc}</Text>
        </View>

        <Text style={styles.sectionTitle}>Dimension Breakdown</Text>
        <View style={styles.grid}>
          <View style={styles.smallCard}>
            <Text style={styles.smallCardTitle}>Inattention Traits (Part A)</Text>
            <Text style={styles.smallCardValue}>{partA} / 36</Text>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, { width: `${partA_pct}%`, backgroundColor: partA > 18 ? '#F59E0B' : '#10B981' }]} />
              <View style={[styles.barThreshold, { left: '50%' }]} />
            </View>
          </View>
          
          <View style={styles.smallCard}>
            <Text style={styles.smallCardTitle}>Hyperactive Traits (Part B)</Text>
            <Text style={styles.smallCardValue}>{partB} / 36</Text>
            <View style={styles.barContainer}>
              <View style={[styles.barFill, { width: `${partB_pct}%`, backgroundColor: partB > 18 ? '#F59E0B' : '#10B981' }]} />
              <View style={[styles.barThreshold, { left: '50%' }]} />
            </View>
          </View>

          {hasGame && (
            <View style={styles.smallCard}>
              <Text style={styles.smallCardTitle}>Attention Game Indicator</Text>
              <Text style={styles.smallCardValue}>{gameRisk}% Risk Score</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${gameRisk}%`, backgroundColor: gameRisk > 60 ? '#F59E0B' : '#10B981' }]} />
                <View style={[styles.barThreshold, { left: '60%' }]} />
              </View>
            </View>
          )}

          {hasText && (
            <View style={styles.smallCard}>
              <Text style={styles.smallCardTitle}>Writing Sample Indicator</Text>
              <Text style={styles.smallCardValue}>{textRisk}% Traits Flagged</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${textRisk}%`, backgroundColor: textRisk > 60 ? '#F59E0B' : '#10B981' }]} />
                <View style={[styles.barThreshold, { left: '60%' }]} />
              </View>
            </View>
          )}
        </View>
        <Footer />
      </Page>

      {/* PAGE 2: DETAILS */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Detailed Analysis</Text>
        
        <Text style={styles.sectionTitle}>ASRS v1.1 Item Responses</Text>
        <Text style={{fontSize:10, color:'#475569'}}>0=Never, 1=Rarely, 2=Sometimes, 3=Often, 4=Very Often</Text>
        
        <View style={styles.heatmapGrid}>
          {Array.from({length: 18}).map((_, i) => {
            const val = inputData[`q${i+1}`];
            return (
              <View key={i} style={[styles.heatmapCell, { backgroundColor: getAnswerColor(val) }]}>
                <Text style={styles.heatmapLabel}>Q{i+1}</Text>
                <Text style={styles.heatmapText}>{val !== null && val !== undefined ? val : '-'}</Text>
                <Text style={{fontSize:5, color:'#475569'}}>{getAnswerLabel(val)}</Text>
              </View>
            );
          })}
        </View>

        {hasGame && (
          <View>
            <Text style={styles.sectionTitle}>Cognitive Game Metrics</Text>
            
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableHeader}>Metric</Text>
                <Text style={styles.tableHeader}>Result</Text>
                <Text style={styles.tableHeader}>Interpretation</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Average Reaction Time</Text>
                <Text style={styles.tableCell}>{Math.round(inputData.quiz_metrics?.reaction?.avgRT || 0)} ms</Text>
                <Text style={styles.tableCell}>General processing speed.</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>RT Variability (StdDev)</Text>
                <Text style={styles.tableCell}>{Math.round(inputData.quiz_metrics?.reaction?.variability || 0)} ms</Text>
                <Text style={styles.tableCell}>Higher variability can indicate inattention.</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Omission/Commission Errors</Text>
                <Text style={styles.tableCell}>{inputData.quiz_metrics?.gono?.errors || 0}</Text>
                <Text style={styles.tableCell}>Measures impulse control and sustained attention.</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Working Memory Level</Text>
                <Text style={styles.tableCell}>{inputData.quiz_metrics?.memory?.level || 0}</Text>
                <Text style={styles.tableCell}>Digit span recall capacity.</Text>
              </View>
            </View>

            {inputData.quiz_metrics?.reaction?.raw && (
              <View style={{marginTop: 15}}>
                 <Text style={{fontSize:10, fontWeight:700, marginBottom: 5}}>Reaction Time Curve (ms)</Text>
                 <LineChart data={inputData.quiz_metrics.reaction.raw} width={500} height={80} />
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Contextual Factors</Text>
        <View style={styles.card}>
          <Text style={styles.textParagraph}>The following self-reported lifestyle factors were active during this screening. These can significantly mimic or exacerbate ADHD-like traits:</Text>
          <View style={{flexDirection:'row', justifyContent:'space-around', marginTop:10}}>
             <View style={{alignItems:'center'}}>
                <Text style={{fontSize:16, fontWeight:900}}>{inputData.sleep_hours} hrs</Text>
                <Text style={{fontSize:8, color:'#64748B', textTransform:'uppercase'}}>Sleep / Night</Text>
             </View>
             <View style={{alignItems:'center'}}>
                <Text style={{fontSize:16, fontWeight:900}}>{inputData.screen_time} hrs</Text>
                <Text style={{fontSize:8, color:'#64748B', textTransform:'uppercase'}}>Screen Time / Day</Text>
             </View>
          </View>
        </View>

        <Footer />
      </Page>

      {/* PAGE 3: MEANING AND NEXT STEPS */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Meaning & Next Steps</Text>
        
        <Text style={styles.sectionTitle}>What this report can and can't tell you</Text>
        <Text style={styles.textParagraph}>CAN: This report summarizes your responses to established screening questionnaires (ASRS v1.1) and experimental cognitive tasks. It identifies if your pattern of answers matches patterns frequently seen in individuals with ADHD.</Text>
        <Text style={styles.textParagraph}>CANNOT: This report cannot diagnose you with ADHD. It cannot prescribe medication, therapy, or formal workplace/school accommodations. An accurate diagnosis requires a comprehensive evaluation by a professional who will consider your developmental history and rule out other causes.</Text>
        
        <Text style={styles.sectionTitle}>Other things that can affect results</Text>
        <Text style={styles.textParagraph}>Many conditions can cause symptoms that look exactly like ADHD. These include:</Text>
        <Text style={styles.textParagraph}>• Severe sleep deprivation or sleep disorders (like sleep apnea)</Text>
        <Text style={styles.textParagraph}>• Chronic stress, anxiety, or depression</Text>
        <Text style={styles.textParagraph}>• Physical health issues (like thyroid problems)</Text>
        <Text style={styles.textParagraph}>• Side effects from certain medications or substances</Text>

        <Text style={styles.sectionTitle}>What to do next</Text>
        <View style={styles.card}>
          <Text style={[styles.textParagraph, {fontWeight: 700, color: '#0F172A'}]}>If you are concerned about your symptoms and they are interfering with your daily life, school, work, or relationships:</Text>
          <Text style={styles.textParagraph}>1. Make an appointment with a primary care doctor, psychiatrist, or psychologist.</Text>
          <Text style={styles.textParagraph}>2. Bring this printed report with you to provide them with a baseline of your symptoms.</Text>
          <Text style={styles.textParagraph}>3. Be prepared to discuss how long these symptoms have been present (especially if they were present in childhood).</Text>
        </View>

        {includeJournal && hasText && (
          <View>
            <Text style={styles.sectionTitle}>Included Journal Extract</Text>
            <View style={{backgroundColor: '#F8FAFC', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0'}}>
               <Text style={{fontSize:9, fontStyle:'italic', color:'#475569', lineHeight: 1.5}}>
                 "{inputData.journal_text.substring(0, 500)}{inputData.journal_text.length > 500 ? '...' : ''}"
               </Text>
            </View>
            <Text style={{fontSize:8, color:'#94A3B8', marginTop: 4}}>Privacy Note: This text was included because you explicitly opted-in to display it on this report.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Method and Sources</Text>
        <Text style={styles.textParagraph}>• Scoring thresholds based on the Adult ADHD Self-Report Scale (ASRS-v1.1) Symptom Checklist.</Text>
        <Text style={styles.textParagraph}>• Kessler RC, et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychol Med. 2005.</Text>
        <Text style={styles.textParagraph}>• Cognitive task design inspired by Continuous Performance Test (CPT) paradigms. Note that digital web-based CPT approximations have limitations in millisecond timing accuracy.</Text>
        <Text style={styles.textParagraph}>• NLP model utilized for text analysis based on linguistic markers of executive dysfunction (experimental).</Text>

        <Footer />
      </Page>
    </Document>
  );
};
