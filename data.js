window.SHAKTII_DATA = {
  stats: {
    protectedFiles: 128,
    verifiedFiles: 121,
    activeUsers: 18,
    securityAlerts: 6,
    blockchainRecords: 143,
    integrityScore: 98
  },
  files: [
    { id: 'FL-001', name: 'ransomware-sample-report.pdf', owner: 'Aarav Mehta', type: 'PDF', size: '2.4 MB', encrypted: true, verified: true, status: 'Protected', hash: 'b7c9a1d4f21e8c90a44d9e001f77bd91', tx: 'TX-8841', uploaded: '2026-09-05 21:20', lastAccessed: '2026-09-06 00:44' },
    { id: 'FL-002', name: 'router-telemetry-dump.json', owner: 'Khushi Jain', type: 'JSON', size: '812 KB', encrypted: true, verified: true, status: 'Protected', hash: '7a21f91ce63a9ab550ac933d1b3d88a2', tx: 'TX-8842', uploaded: '2026-09-05 22:05', lastAccessed: '2026-09-06 00:51' },
    { id: 'FL-003', name: 'network-policy-backup.yaml', owner: 'SOC Admin', type: 'YAML', size: '118 KB', encrypted: true, verified: false, status: 'Review', hash: 'd912af20e118004aa7bd60e89d4fcaa0', tx: 'Pending', uploaded: '2026-09-05 22:45', lastAccessed: '2026-09-05 23:40' },
    { id: 'FL-004', name: 'wallet-risk-export.csv', owner: 'Blockchain Analyst', type: 'CSV', size: '1.1 MB', encrypted: true, verified: true, status: 'Protected', hash: '1f0e99c4f6a73ef91dbac0aee73c1d82', tx: 'TX-8845', uploaded: '2026-09-06 00:05', lastAccessed: '2026-09-06 00:58' },
    { id: 'FL-005', name: 'incident-evidence-pack.zip', owner: 'Incident Lead', type: 'ZIP', size: '8.6 MB', encrypted: true, verified: true, status: 'Protected', hash: 'c9e02b66d183d21b751640d370496447', tx: 'TX-8848', uploaded: '2026-09-06 01:04', lastAccessed: '2026-09-06 01:12' }
  ],
  alerts: [
    { id: 'AL-901', title: 'Suspicious admin session', severity: 'Critical', status: 'Open', asset: 'web-02', ip: '185.220.101.45', time: '2 min ago', detail: 'Failed login burst followed by admin success, key creation and suspicious outbound lookup.', recommendation: 'Freeze admin session and apply temporary IP block.' },
    { id: 'AL-902', title: 'Unverified file access', severity: 'High', status: 'Investigating', asset: 'file-vault', ip: '10.10.4.17', time: '11 min ago', detail: 'Protected file opened from a new device before blockchain verification completed.', recommendation: 'Require step-up verification and log owner confirmation.' },
    { id: 'AL-903', title: 'Policy drift detected', severity: 'Medium', status: 'Open', asset: 'edge-router-01', ip: '192.168.1.1', time: '28 min ago', detail: 'Router rule set differs from last verified secure baseline.', recommendation: 'Compare policy snapshot and restore approved rule set if needed.' },
    { id: 'AL-904', title: 'Repeated verification failure', severity: 'Medium', status: 'Resolved', asset: 'ledger-api', ip: '172.16.8.2', time: '1 hr ago', detail: 'Three failed blockchain verification requests from integration service.', recommendation: 'Check transaction queue and retry ledger verification.' }
  ],
  ledger: [
    { id: 'TX-8841', fileId: 'FL-001', file: 'ransomware-sample-report.pdf', hash: 'b7c9a1d4f21e8c90a44d9e001f77bd91', status: 'Verified', block: 'BLK-30944', owner: 'Aarav Mehta', time: '2026-09-05 21:21', type: 'File Hash' },
    { id: 'TX-8842', fileId: 'FL-002', file: 'router-telemetry-dump.json', hash: '7a21f91ce63a9ab550ac933d1b3d88a2', status: 'Verified', block: 'BLK-30945', owner: 'Khushi Jain', time: '2026-09-05 22:06', type: 'Telemetry Record' },
    { id: 'TX-8845', fileId: 'FL-004', file: 'wallet-risk-export.csv', hash: '1f0e99c4f6a73ef91dbac0aee73c1d82', status: 'Verified', block: 'BLK-30949', owner: 'Blockchain Analyst', time: '2026-09-06 00:08', type: 'Wallet Analysis' },
    { id: 'TX-8848', fileId: 'FL-005', file: 'incident-evidence-pack.zip', hash: 'c9e02b66d183d21b751640d370496447', status: 'Verified', block: 'BLK-30955', owner: 'Incident Lead', time: '2026-09-06 01:06', type: 'Evidence Pack' }
  ],
  activity: [
    { id: 'AC-01', time: '2026-09-06 01:12', user: 'Incident Lead', action: 'Viewed evidence pack', resource: 'FL-005', ip: '10.0.1.22', status: 'Success', ref: 'TX-8848' },
    { id: 'AC-02', time: '2026-09-06 01:08', user: 'SHAKTII Engine', action: 'Generated threat report', resource: 'AL-901', ip: 'system', status: 'Success', ref: 'RP-402' },
    { id: 'AC-03', time: '2026-09-06 00:58', user: 'Blockchain Analyst', action: 'Verified wallet export', resource: 'FL-004', ip: '10.0.2.18', status: 'Success', ref: 'TX-8845' },
    { id: 'AC-04', time: '2026-09-05 23:40', user: 'SOC Admin', action: 'Reviewed network policy', resource: 'FL-003', ip: '10.0.1.7', status: 'Review', ref: 'Pending' },
    { id: 'AC-05', time: '2026-09-05 22:06', user: 'Khushi Jain', action: 'Uploaded telemetry dump', resource: 'FL-002', ip: '10.0.1.44', status: 'Success', ref: 'TX-8842' }
  ],
  reports: [
    { id: 'RP-402', title: 'Threat Analysis Report', type: 'Threat', status: 'Ready', created: '2026-09-06 01:08' },
    { id: 'RP-398', title: 'File Integrity Summary', type: 'Integrity', status: 'Ready', created: '2026-09-05 23:55' },
    { id: 'RP-391', title: 'Blockchain Verification Report', type: 'Ledger', status: 'Ready', created: '2026-09-05 22:30' }
  ],
  analytics: {
    securityEvents: [12, 18, 15, 22, 31, 27, 36],
    filesUploaded: [8, 12, 14, 9, 18, 23, 21],
    verification: [121, 7],
    severity: { Critical: 2, High: 4, Medium: 6, Low: 11 },
    access: [42, 51, 44, 63, 58, 72, 66],
    blockchain: [10, 14, 18, 16, 23, 29, 33]
  }
};
