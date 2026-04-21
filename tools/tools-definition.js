// Service catalog data from tService table
// serviceCatalogId is the unique UUID — CPT codes (serviceCode) are NOT unique
const CPT_CODES = [
  {"serviceCatalogId": "3FF34FF6-E1C4-430F-85C0-000B4C04CCEE", "serviceCode": "99215", "serviceName": "Follow Up Visit - Level 5", "serviceDescription": "Comprehensive follow-up office visit for established patient requiring high complexity medical decision making"},
  {"serviceCatalogId": "4F6320AB-94ED-4317-A24B-0082659C35E8", "serviceCode": "99213", "serviceName": "Care Management", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "6EDEF7C3-4083-402D-B371-00CDB30E8C6E", "serviceCode": "90853", "serviceName": "Behavioral Health Group - Relationships", "serviceDescription": "Phase I Group \u0096 Relationships"},
  {"serviceCatalogId": "A97D18A2-BE11-4D0C-9056-00D049D1B85E", "serviceCode": "90834", "serviceName": "Telemed Individual psychotherapy - 45 min", "serviceDescription": "Individual psychotherapy session lasting approximately 45 minutes"},
  {"serviceCatalogId": "320EA8E4-3250-4AD8-AD79-015B06AFF796", "serviceCode": "20610", "serviceName": "Trochanteric Bursa, under Fluoro", "serviceDescription": "Arthrocentesis under fluoroscopic guidance"},
  {"serviceCatalogId": "6B259A1E-C912-4185-8E77-023B6C8CFDB3", "serviceCode": "97530", "serviceName": "Therapeutic Activities", "serviceDescription": "Dynamic therapeutic activities to improve functional performance"},
  {"serviceCatalogId": "C58FE1AA-3AA6-498B-9CE6-02F5F0E5436E", "serviceCode": "90785", "serviceName": "Interactive Complexity, Telehealth", "serviceDescription": "Interactive complexity add-on for psychiatric procedures"},
  {"serviceCatalogId": "A54AAA6D-D942-4056-BC1D-032504C3F8BE", "serviceCode": "99205", "serviceName": "New Patient Visit - Level 5", "serviceDescription": "Comprehensive new patient office visit requiring high complexity medical decision making"},
  {"serviceCatalogId": "EF681BB9-FC76-4187-89D3-036C61E9EE75", "serviceCode": "99213", "serviceName": "Telemed Medical", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "A6FAA6C7-1D98-4C82-9329-0556E27761EA", "serviceCode": "97002", "serviceName": "Telemed Physical Reconditioning", "serviceDescription": "Physical therapy re-evaluation of established plan of care"},
  {"serviceCatalogId": "E1DB8A78-338F-4710-858A-0591EA0E39BC", "serviceCode": "97150", "serviceName": "Group Chair Pilates", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "C9D8ACDF-B73D-4026-99D9-064BA8B1EE54", "serviceCode": "98943", "serviceName": "Chiropractic Manipulative Treatment (CMT) - Extraspinal; 1+ regions", "serviceDescription": "Chiropractic manipulative treatment of extraspinal regions"},
  {"serviceCatalogId": "75B8B46D-787D-4914-BB05-08818E0A1FB3", "serviceCode": "97750", "serviceName": "Physical Performance Examination", "serviceDescription": "Physical performance test or measurement with written report"},
  {"serviceCatalogId": "FEDB64C4-629E-4301-9C4A-08BB5811EF38", "serviceCode": "97813", "serviceName": "Acupuncture w/ Electrical Stimulation - 15 min.", "serviceDescription": "Acupuncture with electrical stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "24B4B361-45AC-4EBA-BC7F-09CC525A01B0", "serviceCode": "22514", "serviceName": "Lumbar Kyphoplasty", "serviceDescription": "Percutaneous vertebral augmentation, lumbar"},
  {"serviceCatalogId": "610A5AC3-53F7-470A-AADF-0A3CEAA2CA9F", "serviceCode": "90853", "serviceName": "Meditation Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "D9510E3C-F7A5-4020-B20F-0BDC84B8C9FF", "serviceCode": "99245", "serviceName": "Telemed Care Review", "serviceDescription": "Comprehensive consultation for complex medical conditions"},
  {"serviceCatalogId": "AE652E8D-AA1C-4835-BCEE-0BE8236B74B6", "serviceCode": "97150", "serviceName": "Group Movement Therapy", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "2456BA40-4FB5-4067-8EE0-0C081596F359", "serviceCode": "97124", "serviceName": "Light Swedish Massage - 45 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "45464784-49D3-42C5-9EFA-0C5F6DF608CB", "serviceCode": "96372", "serviceName": "Injection Administration (SQ/IM)", "serviceDescription": "Therapeutic or diagnostic injection administered subcutaneously or intramuscularly"},
  {"serviceCatalogId": "E735E337-C4D2-45BC-9064-0C6A1172D899", "serviceCode": "64490", "serviceName": "Cervical/Thoracic MBB", "serviceDescription": "Injection, cervical/thoracic facet joint (1st level)"},
  {"serviceCatalogId": "CF9216F2-04E9-4211-BDBE-0F153DDAEBB0", "serviceCode": "27279", "serviceName": "Minimally Invasive Arthrodesis of the Sacroiliac Joint (SIJ)", "serviceDescription": "Minimally invasive sacroiliac (SI) joint arthrodesis (fusion) procedure"},
  {"serviceCatalogId": "8406352C-AD62-4998-B53A-0F7A130641D3", "serviceCode": "97804", "serviceName": "Medical Nutrition Therapy (Group)", "serviceDescription": "For a group visit (2 or more individuals), 30 minutes per unit"},
  {"serviceCatalogId": "D4C102BF-A616-4144-86A8-1905F86D2AD9", "serviceCode": "97802", "serviceName": "Unit - Nutrition Therapy (NP)", "serviceDescription": "For an initial assessment in a Unit, face-to-face, 15 minutes per unit"},
  {"serviceCatalogId": "85B8EF3A-7DD6-43D5-9127-1963D6BD894D", "serviceCode": "99241", "serviceName": "Office consultation for a new or established patient [15min]", "serviceDescription": "Office consultation for a new or established patient, which requires these 3 key components: A problem focused history; A problem focused examination; and Straightforward medical decision making."},
  {"serviceCatalogId": "3DD34812-F5BD-4C2A-9868-1997AE4E8BA9", "serviceCode": "90853", "serviceName": "Group Psychotherapy - Telemed", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "52DD1D54-818D-4431-94AA-1A495AC5627A", "serviceCode": "97012", "serviceName": "Traction", "serviceDescription": "Mechanical traction therapy to relieve pain and decompress structures"},
  {"serviceCatalogId": "F4F515C2-0CFF-4E42-B7CD-1B40F1E9B521", "serviceCode": "20610", "serviceName": "Euflexxa Injection (without US)", "serviceDescription": "Arthrocentesis without ultrasound guidance"},
  {"serviceCatalogId": "74AD82B2-B8A6-468F-9798-1BF9D5A8B1D7", "serviceCode": "99487", "serviceName": "Nurse Clinic, Medication Education Group", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "67794323-D848-49E7-BAD7-1C165D2066A0", "serviceCode": "20600", "serviceName": "Injection, small joint or bursa", "serviceDescription": "Injection, small joint or bursa (e.g., fingers, toes); without ultrasound guidance"},
  {"serviceCatalogId": "A2298FA5-972B-4317-BFC6-1C6138130F03", "serviceCode": "90785", "serviceName": "Interactive Complexity", "serviceDescription": "Interactive complexity add-on for psychiatric procedures"},
  {"serviceCatalogId": "B2274AB7-3F26-4E07-AE94-1D11A313DCBB", "serviceCode": "90836", "serviceName": "Individual psychotherapy performed with an E/M service - 45 min", "serviceDescription": "Individual psychotherapy add-on performed with evaluation and management service, 45 minutes"},
  {"serviceCatalogId": "5F3106B1-410D-4B21-9B32-1EA8CC416302", "serviceCode": "99487", "serviceName": "Complex Chronic Care Management, First 60 min.", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "42E0124F-C357-4BF3-B51D-1F8990E8406D", "serviceCode": "90853", "serviceName": "Stress and Anxiety Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "0BA3F210-FBE6-406F-97B3-21930046F2E9", "serviceCode": "97112", "serviceName": "Energy Therapy - IND", "serviceDescription": "Neuromuscular reeducation of movement and balance"},
  {"serviceCatalogId": "72DE9DD1-010B-443B-8AD8-244F80A50619", "serviceCode": "J0665", "serviceName": "Bupivacaine", "serviceDescription": "Injection, Bupivacaine (10 units per ML used)"},
  {"serviceCatalogId": "45A963A0-3A33-4EFE-9376-24A97A204C22", "serviceCode": "97140", "serviceName": "Myofascial Release (MFR)", "serviceDescription": "Manual therapy techniques including mobilization and manipulation"},
  {"serviceCatalogId": "6B8D9F77-2C0A-4C24-9E75-24AA1AB18E26", "serviceCode": "98941", "serviceName": "Chiropractic Manipulative Treatment (CMT) - Spinal; 3-4 regions", "serviceDescription": "Chiropractic manipulative treatment of spinal regions, 3-4 regions"},
  {"serviceCatalogId": "2FA38D2A-DB46-48FB-B41E-24AD66C4BE64", "serviceCode": "64421", "serviceName": "Intercostal Nerve Block, each add'tl intercostal nerve", "serviceDescription": "Injection(s), anesthetic agent(s) and/or steroid; each add'tl intercostal nerve"},
  {"serviceCatalogId": "9F86F9B6-90F3-42C2-A7AD-2655730F6AA7", "serviceCode": "64405", "serviceName": "Occipital Nerve Block", "serviceDescription": "Injection, anesthetic agent; greater occipital nerve"},
  {"serviceCatalogId": "6AA201CD-3CAC-4FC1-AC8D-293D944B93A9", "serviceCode": "90876", "serviceName": "Individual Psychotherapy w/ Biofeedback - 45 min", "serviceDescription": "Individual psychophysiological therapy with biofeedback training"},
  {"serviceCatalogId": "11CF263D-199A-46A1-A7CD-2A1034D0B42E", "serviceCode": "80305", "serviceName": "Internal UDS Screen", "serviceDescription": "Drug screening by immunoassay for multiple drug classes"},
  {"serviceCatalogId": "D977ECF0-DC07-44B5-B7EF-2BAF7DD03CEE", "serviceCode": "97026", "serviceName": "Infrared Therapy", "serviceDescription": "Application of infrared light therapy modality"},
  {"serviceCatalogId": "E5377CA2-1BF6-4928-919D-2BCD78EC2D39", "serviceCode": "99213", "serviceName": "Follow Up Visit - Level 3", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "988BC3E1-52B5-4050-BFED-2C51AAB31D0D", "serviceCode": "90839", "serviceName": "Psychotherapy for crisis; first 60 minutes", "serviceDescription": "Psychotherapy for crisis; first 60 minutes"},
  {"serviceCatalogId": "EEE72FF5-F70B-40A5-A1AD-2CF562B0ABAB", "serviceCode": "97014", "serviceName": "Electrical Stimulation (unattended)", "serviceDescription": "Application of electrical stimulation therapy, unattended"},
  {"serviceCatalogId": "2BDEB051-9A21-4B6C-80FC-2E0254FD2621", "serviceCode": "28890", "serviceName": "Shock Wave Therapy", "serviceDescription": "Extracorporeal shock wave therapy for musculoskeletal conditions"},
  {"serviceCatalogId": "83A136BB-D4C5-489A-B21F-319C6EC673D3", "serviceCode": "97110", "serviceName": "Pilates - IND", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "A14282F6-5F94-4731-9010-31B5AB566840", "serviceCode": "22513", "serviceName": "Thoracic Kyphoplasty", "serviceDescription": "Percutaneous vertebral augmentation, thoracic"},
  {"serviceCatalogId": "45138617-E8B1-4382-95DE-31BA948747E5", "serviceCode": "90832", "serviceName": "Telemed Behavioral Health, In Office - 30 min", "serviceDescription": "Individual psychotherapy session lasting approximately 30 minutes"},
  {"serviceCatalogId": "36EDB06B-526B-4E5D-BE34-33A7290BF6E4", "serviceCode": "64493", "serviceName": "Lumbar/Sacral MBB", "serviceDescription": "Injection, lumbar/sacral facet joint (1st level)"},
  {"serviceCatalogId": "288C8487-0BD7-4892-8A0F-3609B91D7FB2", "serviceCode": "90847", "serviceName": "Family psychotherapy with the patient present", "serviceDescription": "Family psychotherapy session with patient present"},
  {"serviceCatalogId": "0AEE2213-9D1D-4111-A288-3644B114182E", "serviceCode": "64628", "serviceName": "Basivertebral Nerve Ablation", "serviceDescription": "Thermal destruction of the intraosseous basivertebral nerve, for the first two vertebral bodies (lumbar or sacral)"},
  {"serviceCatalogId": "523769D3-AEDC-4590-A3F6-36837BD7C2E7", "serviceCode": "64635", "serviceName": "Lumbar/Sacral RFA", "serviceDescription": "Radiofrequency ablation, lumbar/sacral (1st level)"},
  {"serviceCatalogId": "C5B14E07-F625-4635-A121-3769BBB907FA", "serviceCode": "99214", "serviceName": "Telemed Medical Follow Up, In Office - Level 4", "serviceDescription": "Established patient office visit requiring moderate complexity medical decision making"},
  {"serviceCatalogId": "BF6DA1FB-3160-4575-A66C-3866E60FA014", "serviceCode": "90832", "serviceName": "Telemed Behavioral", "serviceDescription": "Individual psychotherapy session lasting approximately 30 minutes"},
  {"serviceCatalogId": "0DCC8A68-CED6-4EBE-A656-39639C87AD19", "serviceCode": "97750", "serviceName": "Functional Assessment", "serviceDescription": "Physical performance test or measurement with written report"},
  {"serviceCatalogId": "06FF2A53-3B77-46DA-A3F5-3AB51E4636EA", "serviceCode": "64510", "serviceName": "Stellate Ganglion Nerve Block", "serviceDescription": "Injection, anesthetic agent; stellate ganglion"},
  {"serviceCatalogId": "F38C30C9-CCA6-456A-B4D0-3B5549B45297", "serviceCode": "90837", "serviceName": "Individual psychotherapy - 60 min", "serviceDescription": "Individual psychotherapy session lasting approximately 60 minutes"},
  {"serviceCatalogId": "409BD0AF-1489-47CA-8B86-3B7E507C00EE", "serviceCode": "L3915", "serviceName": "DME Fitting - Wrist Brace, Hinged Wrist (Aspen)", "serviceDescription": "DME Fitting - Wrist Brace, Hinged Wrist (Aspen)"},
  {"serviceCatalogId": "8965B045-843C-41AC-8971-3BA92D02A720", "serviceCode": "97810", "serviceName": "Acupuncture - 15 min", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "C537090D-76BA-4CA0-84D1-3BD947971863", "serviceCode": "G9008", "serviceName": "ECM Outreach, In Person, Clinical Staff", "serviceDescription": "ECM Outreach, In Person, Clinical Staff"},
  {"serviceCatalogId": "6B23881F-C227-49E8-ACB6-3D56A3EC9C29", "serviceCode": "99437", "serviceName": "Add-on code for CPT 99491; additional 30 mins (once per calendar month)", "serviceDescription": "add-on code for CPT code 99491; each additional 30 minutes  by a physician or other qualified health care professional, per calendar month"},
  {"serviceCatalogId": "74AD30B2-7340-4B23-AA90-3DB30BD9874A", "serviceCode": "98962", "serviceName": "Telemed Education", "serviceDescription": "Telemed Education"},
  {"serviceCatalogId": "F2C02ED0-E1EE-40C5-8289-3ED1C6090C11", "serviceCode": "97803", "serviceName": "Unit - Telemed Nutrition Therapy", "serviceDescription": "Unit - Telemed Nutrition Therapy"},
  {"serviceCatalogId": "A3FC603D-583E-4E9A-BF95-3F5E23F95B3C", "serviceCode": "96137", "serviceName": "Psychological Testing Administration, Add'l 30 Minutes", "serviceDescription": "Psychological Testing Administration, Add'l 30 Minutes"},
  {"serviceCatalogId": "C129B06B-EF36-4776-833A-4026B14C39DB", "serviceCode": "99429", "serviceName": "Other Preventive Medicine Services", "serviceDescription": "PAIN1"},
  {"serviceCatalogId": "1D024245-0BDB-4CB1-9132-40B204E5D31D", "serviceCode": "97802", "serviceName": "Medical Nutrition Therapy (NP)", "serviceDescription": "For an initial assessment, face-to-face, 15 minutes per unit"},
  {"serviceCatalogId": "8006BD6A-BED5-45AA-943D-4264F390AE5B", "serviceCode": "97545", "serviceName": "Strength Training", "serviceDescription": "Strength Training"},
  {"serviceCatalogId": "EA8B94B2-0DCA-4BB0-B022-42B72B349E3C", "serviceCode": "G9012", "serviceName": "ECM Activity, Telemed, Non-Clinical Staff", "serviceDescription": "ECM Activity, Telemed, Non-Clinical Staff"},
  {"serviceCatalogId": "AC42AD91-B6EA-428F-B4AB-45F027ACD42B", "serviceCode": "97814", "serviceName": "Acupuncture w/ Electrical Stimulation - 30 min.", "serviceDescription": "Acupuncture with electrical stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "95FAB2C3-C04E-4820-94ED-45F1057AFE8F", "serviceCode": "96136", "serviceName": "Psychological Testing Administration, First 30 Minutes", "serviceDescription": "Psychological Testing Administration, First 30 Minutes"},
  {"serviceCatalogId": "C44A8510-CD0C-41F4-AA71-465E53C47FE7", "serviceCode": "99211", "serviceName": "Follow Up Visit - Level 1", "serviceDescription": "Office visit for established patient not requiring physician presence"},
  {"serviceCatalogId": "BA229055-4127-475B-A0BD-46718AC14452", "serviceCode": "90791", "serviceName": "Behavioral Health Intake", "serviceDescription": "Psychiatric diagnostic evaluation"},
  {"serviceCatalogId": "4CA91640-0CEE-4938-B5C0-46B8F812A41A", "serviceCode": "99429", "serviceName": "Other Preventive Medicine Services", "serviceDescription": "PAIN4"},
  {"serviceCatalogId": "75855B26-C73A-4685-B662-47084650061F", "serviceCode": "J2003", "serviceName": "Lidocaine, 1mg", "serviceDescription": "Injection, lidocaine hydrochloride, 1 mg (1mg = 1 unit)"},
  {"serviceCatalogId": "7422983E-E734-4AE1-96E5-473F50517DAF", "serviceCode": "62323", "serviceName": "LESI", "serviceDescription": "Injection, lumbar epidural"},
  {"serviceCatalogId": "78B74763-1732-4349-8363-4741721529A6", "serviceCode": "98962", "serviceName": "Group Health Education", "serviceDescription": "Group Health Education"},
  {"serviceCatalogId": "3E071BC2-93DB-4B18-860E-4826C41E57C1", "serviceCode": "X3908", "serviceName": "Physiotherapy - Initial 30 Minutes", "serviceDescription": "Physiotherapy - Initial 30 Minutes"},
  {"serviceCatalogId": "AFE8E866-D9DB-409F-B20E-48BCD70FCD47", "serviceCode": "X3910", "serviceName": "Physiotherapy - Additional 15 Minutes", "serviceDescription": "Physiotherapy - Additional 15 Minutes"},
  {"serviceCatalogId": "3F00ED1D-1DCF-4F17-A692-4B9D7789E710", "serviceCode": "99491", "serviceName": "CCM services provided personally by physician or qualified medical professional; 30 mins", "serviceDescription": "Chronic care management services, provided personally by a physician or other  qualified healthcare professional, at least 30 minutes of physician or other qualified  healthcare professional time, per calendar month"},
  {"serviceCatalogId": "69E59B55-096A-4357-9CC1-4E0D7BC6EB13", "serviceCode": "20611", "serviceName": "Trochanteric Bursa with US", "serviceDescription": "Arthrocentesis with ultrasound guidance"},
  {"serviceCatalogId": "88815DB5-98C4-441C-9A78-4F038588D916", "serviceCode": "96127", "serviceName": "Developmental and Behavioral Screening and Testing", "serviceDescription": "Brief emotional or behavioral assessment screening"},
  {"serviceCatalogId": "81AE687A-BA04-4ECA-A6B0-4F10C9E21A88", "serviceCode": "97002", "serviceName": "Telemed Physical Reconditioning - Feeding Your Body", "serviceDescription": "Physical therapy re-evaluation of established plan of care"},
  {"serviceCatalogId": "92CB146E-7235-4047-B0FA-504A92BDB9A1", "serviceCode": "G9008", "serviceName": "ECM Activity, In Person, Clinical Staff", "serviceDescription": "ECM Activity, In Person, Clinical Staff"},
  {"serviceCatalogId": "616BD6D2-B13B-466A-9D63-53AE3B14866B", "serviceCode": "99487", "serviceName": "Lab Collection (Urine)", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "6E34CF14-6F2D-446A-8BBA-53B0EE2E3E53", "serviceCode": "90853", "serviceName": "Stress Management Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "D458A5B2-BC7F-4E8D-95C1-558A0CD35164", "serviceCode": "L0650", "serviceName": "DME Fitting - Upper Back Brace (Aspen)", "serviceDescription": "DME Fitting - Upper Back Brace (Aspen)"},
  {"serviceCatalogId": "2B6155DA-EEBE-4134-8349-55C44532230A", "serviceCode": "99212", "serviceName": "Follow Up Visit - Level 2", "serviceDescription": "Brief office visit for established patient with straightforward decision making"},
  {"serviceCatalogId": "7C5F801D-5E6B-42C0-8934-572DD935A4FB", "serviceCode": "22515", "serviceName": "Kyphoplasty, each add'tl vertebral body", "serviceDescription": "Percutaneous vertebral augmentation; each additional thoracic or lumbar vertebral body"},
  {"serviceCatalogId": "BC459A11-9BBD-448A-BCAC-579B06867700", "serviceCode": "97803", "serviceName": "Medical Nutrition Therapy (FU)", "serviceDescription": "For a follow up visit or reassessment, face-to-face, 15 minutes per unit"},
  {"serviceCatalogId": "9ECDA4ED-4FED-442C-9B77-592918C208B2", "serviceCode": "96150", "serviceName": "Health-Oriented Questionnaires", "serviceDescription": "Health-Oriented Questionnaires"},
  {"serviceCatalogId": "7761B9E4-761B-439F-9A22-5BB2663A86E7", "serviceCode": "99487", "serviceName": "Lab Collection (Blood)", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "F0509469-013E-4824-B6FA-5BC93BF044BC", "serviceCode": "97110", "serviceName": "Movement Therapy - IND", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "620C16A2-8106-4EFB-A3F7-5C8395496246", "serviceCode": "X3908", "serviceName": "Individual Qi Gong", "serviceDescription": "Individual Qi Gong"},
  {"serviceCatalogId": "01944600-67B4-4699-9E0A-5EC727725AA7", "serviceCode": "90853", "serviceName": "Behavioral Health Group - Sleep", "serviceDescription": "Phase I Group - Sleep"},
  {"serviceCatalogId": "FFAE0950-3E07-40B7-A608-619AB75BCEA2", "serviceCode": "J1100", "serviceName": "Dexamethasone, 10mg", "serviceDescription": "Injection, Dexamethasone 10mg (total units = 10x (number of vials used)"},
  {"serviceCatalogId": "FF384CB4-0C9E-4494-AA01-61CCB9395136", "serviceCode": "97810", "serviceName": "Sonoacupuncture", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "DB7A63E8-8C15-44E1-AAD6-623ECB9062F4", "serviceCode": "20605", "serviceName": "Injection, intermediate joint or bursa", "serviceDescription": "Injection, intermediate joint or bursa (e.g., temporomandibular, acromioclavicular, elbow, wrist); without ultrasound guidance"},
  {"serviceCatalogId": "044B4BF7-1A31-441C-843B-631DFFC4C63B", "serviceCode": "90837", "serviceName": "Telemed Behavioral Health, In Office - 60 min", "serviceDescription": "Individual psychotherapy session lasting approximately 60 minutes"},
  {"serviceCatalogId": "937A0F4B-9285-4040-849F-64381DDF0756", "serviceCode": "97150", "serviceName": "Group Mats Yoga", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "F80C4D57-B250-4C63-8DDE-6497AE08630A", "serviceCode": "97811", "serviceName": "Acupuncture - 30 min", "serviceDescription": "Acupuncture with manual stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "BD27F362-5F12-4693-900F-64D8B9755DD3", "serviceCode": "97112", "serviceName": "Joint Mobility/Kinesiology Taping", "serviceDescription": "Neuromuscular reeducation of movement and balance"},
  {"serviceCatalogId": "5992A721-4757-4F75-8700-65B3E0D76591", "serviceCode": "90846", "serviceName": "Family psychotherapy without the patient present", "serviceDescription": "Family psychotherapy session without patient present"},
  {"serviceCatalogId": "9A088E94-4FB0-45D6-8533-660ABE1D53B7", "serviceCode": "90834", "serviceName": "Individual psychotherapy - 45 min", "serviceDescription": "Individual psychotherapy session lasting approximately 45 minutes"},
  {"serviceCatalogId": "FBD3287F-CDAC-4CB1-B4AE-669921AA595E", "serviceCode": "97810", "serviceName": "Acupressure", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "904FED53-B11F-4E4B-A19C-66B2DC2730E2", "serviceCode": "L3908", "serviceName": "DME Fitting - Formfit Universal Wrist Brace", "serviceDescription": "DME Fitting - Formfit Universal Wrist Brace"},
  {"serviceCatalogId": "9A8E5EB3-E568-4BB9-91A3-67E58138343E", "serviceCode": "L1843", "serviceName": "DME Fitting - Universal OA Knee Brace", "serviceDescription": "DME Fitting - Universal OA Knee Brace"},
  {"serviceCatalogId": "2268C3EF-6848-4816-9358-692458540C5A", "serviceCode": "97814", "serviceName": "Acupuncture w/ Electrical Stimulation - 45 min.", "serviceDescription": "Acupuncture with electrical stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "E5530456-8DE5-45E1-88FE-6A698B0597C0", "serviceCode": "98962", "serviceName": "Unit - Telemed Education", "serviceDescription": "Unit - Telemed Education"},
  {"serviceCatalogId": "C6F5C970-A44D-45CF-BAD7-6B8D7B53F837", "serviceCode": "96130", "serviceName": "Psychological Testing Evaluation, First 30 Minutes", "serviceDescription": "Psychological Testing Evaluation, First 30 Minutes"},
  {"serviceCatalogId": "ACF5BFC3-8164-4DB2-8714-6D3A1EAD18CB", "serviceCode": "99487", "serviceName": "Nurse Clinic, Med Management", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "5D1D64D0-F728-469F-9C1D-6FE5EADC2EF4", "serviceCode": "97016", "serviceName": "Vasopneumatic Device", "serviceDescription": "Vasopneumatic compression device therapy"},
  {"serviceCatalogId": "07DBFCD1-5597-4D3E-81C8-7088CFF27E3E", "serviceCode": "L1833", "serviceName": "DME Fitting - ROM Knee (Aspen)", "serviceDescription": "DME Fitting - ROM Knee (Aspen)"},
  {"serviceCatalogId": "0FA13188-8CA3-4860-8D08-70BC3BA8EAD3", "serviceCode": "G9008", "serviceName": "ECM Activity, Telemed, Clinical Staff", "serviceDescription": "ECM Activity, Telemed, Clinical Staff"},
  {"serviceCatalogId": "1B3FC957-9CD7-4C94-806E-70FC2277B497", "serviceCode": "97112", "serviceName": "Proprioceptive Neuromuscular Facilitation (PNF)", "serviceDescription": "Neuromuscular reeducation of movement and balance"},
  {"serviceCatalogId": "EAA60FA8-1764-4684-963D-7106FA1B0B71", "serviceCode": "98942", "serviceName": "Chiropractic Manipulative Treatment (CMT) - Spinal; 5 regions", "serviceDescription": "Chiropractic manipulative treatment, spinal 5 regions"},
  {"serviceCatalogId": "A08D299B-7E41-446D-999B-724908181A76", "serviceCode": "90853", "serviceName": "Motivation Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "D72BC9D3-2C4C-477F-999A-735A4E80393E", "serviceCode": "20610", "serviceName": "Shoulder Steroid Injection (without US)", "serviceDescription": "Arthrocentesis without ultrasound guidance"},
  {"serviceCatalogId": "4445F774-C43C-4D21-961D-7402F77FDDD7", "serviceCode": "G9012", "serviceName": "ECM Activity, In Person, Non-Clinical Staff", "serviceDescription": "ECM Activity, In Person, Non-Clinical Staff"},
  {"serviceCatalogId": "05E47B11-A075-40FE-AC4A-7444DA93563F", "serviceCode": "99213", "serviceName": "Unit - Group Education", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "FDD5F1B3-AF89-46AC-B3BE-756B5BF44E5E", "serviceCode": "90853", "serviceName": "Telemed Group Psychotherapy - Improving Sleep", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "AF613A18-6F94-4AA5-979C-76730FD24E01", "serviceCode": "L0637", "serviceName": "Lumbar lower back brace", "serviceDescription": "Lumbar lower back brace"},
  {"serviceCatalogId": "968C7129-BD2A-4CC9-B239-76F9DAA0E7D9", "serviceCode": "90853", "serviceName": "Behavioral Health Group \u0096 Psychological Effects of Stress", "serviceDescription": "Phase II Group \u0096 Psychological Effects of Stress"},
  {"serviceCatalogId": "42DC9BDD-1A33-4B8D-8B34-771450D2B63F", "serviceCode": "90853", "serviceName": "Telemed Group Psychotherapy - Managing Stress", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "7BE57445-C2AF-4E12-AE90-7754F1AFE1B3", "serviceCode": "64517", "serviceName": "Hypogastric Block", "serviceDescription": "Injection, anesthetic agent; superior hypogastric plexus"},
  {"serviceCatalogId": "31FE2FB7-2D50-4839-812D-77C769D11922", "serviceCode": "20550", "serviceName": "Tendon Sheath Injection", "serviceDescription": "Injection(s); single tendon sheath, or ligament"},
  {"serviceCatalogId": "78E27968-3406-49EF-B7A5-7839021076E4", "serviceCode": "90832", "serviceName": "Unit - Telemed Behavioral", "serviceDescription": "Individual psychotherapy session lasting approximately 30 minutes"},
  {"serviceCatalogId": "6DD4ACD6-9D52-44B5-860A-7A5CA7DBC0BB", "serviceCode": "L3916", "serviceName": "DME Fitting - Wrist Brace, Hinged Wrist, Elastic Bands (Aspen)", "serviceDescription": "DME Fitting - Wrist Brace, Hinged Wrist, Elastic Bands (Aspen)"},
  {"serviceCatalogId": "93D48917-D30E-4E09-8D82-7B9DF562A6ED", "serviceCode": "90853", "serviceName": "Trauma / PTSD Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "7427348B-FF1D-420B-949A-7D4848ECB099", "serviceCode": "20550", "serviceName": "Plantar Fascia Injection", "serviceDescription": "Injection(s); single tendon sheath, or ligament, aponeurosis"},
  {"serviceCatalogId": "61391735-A24B-4E49-B0E0-7D79B7AFC03E", "serviceCode": "97810", "serviceName": "Laser Needles", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "0855ACB5-76EB-4FDF-B26C-7E8CE20AEDF3", "serviceCode": "99426", "serviceName": "Principal Care Management (Clinical Staff), First 30 min.", "serviceDescription": "Principal Care Management (Clinical Staff), First 30 min."},
  {"serviceCatalogId": "1DA68A94-8054-435C-8434-7F0AE4B681B6", "serviceCode": "97113", "serviceName": "Aquatic Exercise", "serviceDescription": "Aquatic therapy with therapeutic exercises"},
  {"serviceCatalogId": "E26943C3-77A4-4ED1-852F-80FCAFD94749", "serviceCode": "97140", "serviceName": "Muscle Energy Techniques (MET)", "serviceDescription": "Manual therapy techniques including mobilization and manipulation"},
  {"serviceCatalogId": "A702DD5B-4458-40FE-98D0-81CCC2AF0C43", "serviceCode": "83036", "serviceName": "Internal HbA1c Test", "serviceDescription": "Internal HbA1c Test"},
  {"serviceCatalogId": "FB7A4A6F-44CB-4E9D-8572-82E61A775E57", "serviceCode": "62323", "serviceName": "Caudal ESI", "serviceDescription": "Injection, caudal epidural"},
  {"serviceCatalogId": "CAE75FB8-CBFC-491A-89B8-83183AACFE60", "serviceCode": "L0456", "serviceName": "DME Fitting - Back Brace (TLSO 0456)", "serviceDescription": "DME Fitting - Back Brace (TLSO 0456)"},
  {"serviceCatalogId": "6B016F94-538E-4A4A-A911-833A72E90896", "serviceCode": "97150", "serviceName": "Group Tai Chi", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "27AAACED-8E10-4C5E-9584-838B0B8D6F79", "serviceCode": "97811", "serviceName": "Acupuncture - 60 min", "serviceDescription": "Acupuncture with manual stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "66FB47A1-91E8-41E8-90F6-83E323F3B67A", "serviceCode": "99245", "serviceName": "Unit - Telemed Care Review", "serviceDescription": "Comprehensive consultation for complex medical conditions"},
  {"serviceCatalogId": "0A44547C-B885-407B-84EA-849AC99D555C", "serviceCode": "97124", "serviceName": "Massage Therapy -30 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "7061498F-EDA8-4DB0-9135-85942C7C0A03", "serviceCode": "90853", "serviceName": "Substance Use Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "60858BA1-3E7A-457A-A0E8-85A70C4146BA", "serviceCode": "27096", "serviceName": "SI Joint Injection", "serviceDescription": "Injection procedure for sacroiliac joint"},
  {"serviceCatalogId": "16AA7947-E796-4976-A1C4-8686368DE7BA", "serviceCode": "97140", "serviceName": "Reflexology", "serviceDescription": "Manual therapy techniques including mobilization and manipulation"},
  {"serviceCatalogId": "FA7A1810-0BFF-4D13-9C3B-879C44AF8CE7", "serviceCode": "20610", "serviceName": "Knee Steroid Injection (without US)", "serviceDescription": "Arthrocentesis without ultrasound guidance"},
  {"serviceCatalogId": "F82645A1-FF6A-4DCF-9F38-87A8372EF443", "serviceCode": "99489", "serviceName": "Complex Chronic Care Management, Each Addt'l 30 min.", "serviceDescription": "Complex Chronic Care Management, Each Addt'l 30 min."},
  {"serviceCatalogId": "D5AAA0B6-F770-4A15-BE14-87BA9CAEA2B6", "serviceCode": "G9012", "serviceName": "ECM Outreach, Telemed, Non-Clinical Staff", "serviceDescription": "ECM Outreach, Telemed, Non-Clinical Staff"},
  {"serviceCatalogId": "CCECDDE7-895E-4AAC-8510-87BC3EF264AD", "serviceCode": "97150", "serviceName": "Group Mats Pilates", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "9C355B93-E106-46B3-A564-87E075DA71D3", "serviceCode": "L0180", "serviceName": "DME Fitting - Neck Collar (Aspen)", "serviceDescription": "DME Fitting - Neck Collar (Aspen)"},
  {"serviceCatalogId": "8521FBA8-6D9D-4D17-A017-89C2B2037311", "serviceCode": "90833", "serviceName": "Individual psychotherapy performed with an E/M service - 30 min", "serviceDescription": "Individual psychotherapy add-on performed with E/M service, 30 minutes"},
  {"serviceCatalogId": "7B3B485F-1F92-40F3-B1A8-8A4FCF4D8BE3", "serviceCode": "97150", "serviceName": "Group Movement Therapy - Lower Body", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "EF32493E-25B0-41B3-976D-8A52691FC4CB", "serviceCode": "97150", "serviceName": "Group Yoga", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "4EF76C4B-0C3B-474F-A363-8A90DF011314", "serviceCode": "99487", "serviceName": "Nurse Clinic, Substance Abuse/Detox Program", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "E0CF321B-9F7B-45C6-85F6-8B29D7EBB9A3", "serviceCode": "90838", "serviceName": "Individual psychotherapy performed with an E/M service - 60 min", "serviceDescription": "Psychotherapy add-on performed with E/M service, 60 minutes"},
  {"serviceCatalogId": "9DAAC59B-24A0-4DD7-B25D-8C88D84B5047", "serviceCode": "97035", "serviceName": "Ultrasound/Phonophoresis", "serviceDescription": "Application of ultrasound therapy for tissue healing"},
  {"serviceCatalogId": "045B549D-2EB7-41A9-A32B-8E8218963A46", "serviceCode": "97010", "serviceName": "Hot/Cold Packs", "serviceDescription": "Application of hot or cold packs therapy"},
  {"serviceCatalogId": "74F85F8B-F408-4AEC-99E1-8F0E6E04EAA4", "serviceCode": "99487", "serviceName": "Nurse Clinic, Diabetes Awareness Group", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "35D6A417-28D6-4FAA-8B88-8F5B16176459", "serviceCode": "97810", "serviceName": "Hook Needles", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "A3CBDCF8-7433-4146-A7C1-901898E2880D", "serviceCode": "99245", "serviceName": "New Patient Visit - Level 4", "serviceDescription": "Comprehensive consultation for complex medical conditions"},
  {"serviceCatalogId": "2AEFC104-E739-4613-9F67-910758828543", "serviceCode": "97814", "serviceName": "Acupuncture w/ Electrical Stimulation - 60 min.", "serviceDescription": "Acupuncture with electrical stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "5AEA989F-DBAB-4EFE-B8D6-9153CB77CD20", "serviceCode": "99439", "serviceName": "Chronic Care Management, Each Addt'l 20 min.", "serviceDescription": "Chronic Care Management, Each Addt'l 20 min."},
  {"serviceCatalogId": "34FBABA3-E4A7-4D0B-8F61-94DDB2E42BE3", "serviceCode": "64483", "serviceName": "TFESI", "serviceDescription": "Transforaminal epidural injection (1st level)"},
  {"serviceCatalogId": "038E1624-B3AA-45AE-990E-978C636AAAD9", "serviceCode": "97112", "serviceName": "Neuromuscular Re-education", "serviceDescription": "Neuromuscular reeducation of movement and balance"},
  {"serviceCatalogId": "4963BAFD-29D7-4E7A-9115-97F45B83E570", "serviceCode": "97139", "serviceName": "IASTM (Graston, Gua Sha)", "serviceDescription": "Unlisted therapeutic procedure"},
  {"serviceCatalogId": "54646585-0DD1-4D46-B13C-98EAB356C12F", "serviceCode": "97110", "serviceName": "Therapeutic Procedures", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "829CE452-0133-4C94-B793-990295BD3F45", "serviceCode": "97124", "serviceName": "Massage Therapy -45 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "E69BEDAC-7086-4CDD-83DF-99C2E20F9D1A", "serviceCode": "97110", "serviceName": "Yoga - IND", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "C9C7A29E-E64C-462C-85F8-9A0F52579DEA", "serviceCode": "64420", "serviceName": "Intercostal Nerve Block", "serviceDescription": "Injection(s), anesthetic agent(s) and/or steroid; intercostal nerve"},
  {"serviceCatalogId": "BD2D32C2-5CBD-4B1D-995D-9BAE49AC9265", "serviceCode": "97116", "serviceName": "Gait Training", "serviceDescription": "Gait training therapy to improve walking ability"},
  {"serviceCatalogId": "5EAF01CD-4F08-4CD0-A309-9BC4F1103312", "serviceCode": "90832", "serviceName": "Individual psychotherapy - 30 min", "serviceDescription": "Individual psychotherapy session lasting approximately 30 minutes"},
  {"serviceCatalogId": "0AA57214-7F84-4AB7-AE9A-9CB740C5CB2B", "serviceCode": "97110", "serviceName": "Therapeutic Exercise", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "8AF97572-3C5D-45F3-92BB-9D60477043EB", "serviceCode": "99429", "serviceName": "Other Preventive Medicine Services", "serviceDescription": "PAIN2"},
  {"serviceCatalogId": "B67A85D5-374E-4674-92E6-9DE2F1AC6B30", "serviceCode": "97139", "serviceName": "Vibration/Jostling", "serviceDescription": "Unlisted therapeutic procedure"},
  {"serviceCatalogId": "342C8978-4164-4050-B502-9E697E6BE0F2", "serviceCode": "97150", "serviceName": "Group Movement Therapy - Mixed Joint", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "6C7860E6-E423-411D-9D8C-9E9064C25755", "serviceCode": "64450", "serviceName": "Saphenous Nerve Block", "serviceDescription": "Injection(s), anesthetic agent(s) and/or steroid; saphenous nerve"},
  {"serviceCatalogId": "77F211D7-9E3F-4256-8C74-9F0ABD3D446C", "serviceCode": "97140", "serviceName": "Manual Therapy", "serviceDescription": "Manual therapy techniques including mobilization and manipulation"},
  {"serviceCatalogId": "3CA71FB2-5096-4307-92A2-A16F7FB89CAC", "serviceCode": "62321", "serviceName": "TESI", "serviceDescription": "Injection, thoracic epidural"},
  {"serviceCatalogId": "BCACD5AF-10D2-43E2-A0A0-A2C455BC433F", "serviceCode": "97018", "serviceName": "Paraffin Bath", "serviceDescription": "Paraffin bath heat therapy for pain relief"},
  {"serviceCatalogId": "C46E324B-DC60-4D7F-97E4-A35424723B0D", "serviceCode": "97112", "serviceName": "Neuromuscular Therapy (NMT)", "serviceDescription": "Neuromuscular reeducation of movement and balance"},
  {"serviceCatalogId": "7BA2E6D0-C7CC-4221-B95F-A4906C22C447", "serviceCode": "64450", "serviceName": "Lateral Branch Block", "serviceDescription": "Injection, anesthetic agent; other peripheral nerve or branch"},
  {"serviceCatalogId": "F8039184-79D9-4A55-8ED9-A4CD0A940F2F", "serviceCode": "90853", "serviceName": "Telemed Group Psychotherapy - Mind/Body Connection", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "8C82D11B-595D-42BC-9C59-A688A70DD152", "serviceCode": "64640", "serviceName": "Genicular Nerve Block", "serviceDescription": "Destruction by neurolytic agent; other peripheral nerve or branch"},
  {"serviceCatalogId": "0D262839-07E1-4BD3-9340-A83946FD3CA6", "serviceCode": "90853", "serviceName": "Behavioral Health Group - Welcome/SMART Goals", "serviceDescription": "Phase I Group \u0096 Welcome/SMART Goals"},
  {"serviceCatalogId": "643AB9DE-FA77-4EF0-9544-A97709112C20", "serviceCode": "93000", "serviceName": "ELECTROCARDIOGRAM, ROUTINE ECG WITH AT LEAST 12 LEADS", "serviceDescription": "ELECTROCARDIOGRAM, ROUTINE ECG WITH AT LEAST 12 LEADS"},
  {"serviceCatalogId": "E5853DB7-D22D-4D1C-ADF4-A9A8C7DFAC21", "serviceCode": "64629", "serviceName": "Basivertebral Nerve Ablation, Additional Levels", "serviceDescription": "Thermal destruction of the intraosseous basivertebral nerve, each additional vertebral body (lumbar or sacral)"},
  {"serviceCatalogId": "DBF68F1A-05BA-4723-A16B-AB008B6593BC", "serviceCode": "97124", "serviceName": "Friction/Cross friction", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "D8B71502-70C8-4890-A733-ACA397BC8FCC", "serviceCode": "63655", "serviceName": "Spinal Cord Stimulator (SCS) Implant", "serviceDescription": "Percutaneous implantation of neurostimulator electrodes, plate/paddle, epidural"},
  {"serviceCatalogId": "C1D7C305-2D2B-4DBB-A7DF-ADF18E535CF9", "serviceCode": "64634", "serviceName": "Cervical/Thoracic RFA (2nd level)", "serviceDescription": "Radiofrequency ablation, cervical/thoracic (2nd level)"},
  {"serviceCatalogId": "0461DFD6-45D7-47E0-B9D4-AE358BF66E46", "serviceCode": "20610", "serviceName": "Hip Joint Injection", "serviceDescription": "Arthrocentesis, aspiration and/or injection; major joint or bursa"},
  {"serviceCatalogId": "42F2467D-D0D8-4F11-8EAC-B292EA4E5F22", "serviceCode": "97110", "serviceName": "Active/Passive Stretching", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "CD80BC17-A59C-40C3-8FBB-B4F8BF22BA97", "serviceCode": "97802", "serviceName": "Telehealth-Medical Nutrition Therapy (NP)", "serviceDescription": "For an initial assessment, face-to-face, 15 minutes per unit"},
  {"serviceCatalogId": "59599174-7635-4C55-8682-B587E80DCA4B", "serviceCode": "22511", "serviceName": "Lumbar Vertebroplasty", "serviceDescription": "Percutaneous vertebroplasty, lumbar"},
  {"serviceCatalogId": "6D099012-E063-45E2-8B03-B5B4DA993811", "serviceCode": "0275T", "serviceName": "MILD (Minimally Invasive Lumbar Decompression)", "serviceDescription": "Percutaneous laminotomy/laminectomy (interlaminar approach) for decompression of neural elements"},
  {"serviceCatalogId": "190C2612-3AD0-4A28-9B35-B784C978181A", "serviceCode": "62321", "serviceName": "CESI", "serviceDescription": "Injection, cervical epidural"},
  {"serviceCatalogId": "AA544314-BB10-4274-8EC6-B8AE6EB18BAC", "serviceCode": "97036", "serviceName": "Hydrotherapy Hubbard Tank", "serviceDescription": "Hydrotherapy Hubbard Tank"},
  {"serviceCatalogId": "5A7861E6-E7F8-4B29-AB7A-BAA9E2E3773A", "serviceCode": "90901", "serviceName": "Biofeedback Training By Any Modality", "serviceDescription": "Biofeedback Training By Any Modality"},
  {"serviceCatalogId": "69E942E6-BD9A-41F6-BAE5-BB27B7B5A813", "serviceCode": "97811", "serviceName": "Acupuncture - 45 min", "serviceDescription": "Acupuncture with manual stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "393B1FD9-5D58-49B1-BB6E-BB649950059E", "serviceCode": "99203", "serviceName": "New Patient Visit - Level 3", "serviceDescription": "New patient office visit requiring low complexity medical decision making"},
  {"serviceCatalogId": "9786B8F6-21A9-46DE-8698-BB948ADAB0B1", "serviceCode": "97002", "serviceName": "Whirlpool", "serviceDescription": "Physical therapy re-evaluation of established plan of care"},
  {"serviceCatalogId": "7177ED3D-ECA3-46C3-A3C0-BDDABC4EBF3E", "serviceCode": "99487", "serviceName": "Nurse Clinic, Disability Paperwork Assistance", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "C8E74A74-3035-42E6-8158-BEE9B97DB438", "serviceCode": "22512", "serviceName": "Vertebroplasty, each add'tl vertebral body", "serviceDescription": "Percutaneous vertebral augmentation; each additional thoracic or lumbar vertebral body"},
  {"serviceCatalogId": "29B5CE2C-C78F-4DAF-BF11-BEEF56E15D17", "serviceCode": "97150", "serviceName": "Group Chair Yoga", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "4E30EE9C-5F9A-4C70-AD82-C09CDBC8A3C6", "serviceCode": "L0648", "serviceName": "DME Fitting - Lower Back Brace (Aspen)", "serviceDescription": "DME Fitting - Lower Back Brace (Aspen)"},
  {"serviceCatalogId": "0620711D-12B2-4D23-AA54-C0B1EA1E395A", "serviceCode": "97140", "serviceName": "Trigger Point Therapy", "serviceDescription": "Manual therapy techniques including mobilization and manipulation"},
  {"serviceCatalogId": "AC935458-7B6D-4077-9AE8-C0F630F645B9", "serviceCode": "20552", "serviceName": "Piriformis Injection", "serviceDescription": "Injection(s); single or multiple trigger point(s), 1 or 2 muscle(s)"},
  {"serviceCatalogId": "2EDC0662-C693-4419-8DA3-C10CDADF1BD1", "serviceCode": "90853", "serviceName": "Behavioral Health Group \u0096 Anxiety and Fear", "serviceDescription": "Phase II Group \u0096 Anxiety and Fear"},
  {"serviceCatalogId": "FCE801DA-8BC4-4DF4-9016-C1BCE89CFB2A", "serviceCode": "90911", "serviceName": "Biofeedback Training (Perineal Muscles, Anorectal or Urethral Sphincter, including EMG and/or manometry)", "serviceDescription": "Biofeedback Training (Perineal Muscles, Anorectal or Urethral Sphincter, including EMG and/or manometry)"},
  {"serviceCatalogId": "BAB771B7-9DBB-4DC4-8029-C1C2C8D0BC65", "serviceCode": "97124", "serviceName": "Light Swedish Massage - 60 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "CCF83178-1E51-4E71-BEB8-C1ED00262C01", "serviceCode": "L3908", "serviceName": "DME Fitting - Wrist Hand Orthosis (WHO), Wrist Extension", "serviceDescription": "DME Fitting - Wrist Hand Orthosis (WHO), Wrist Extension"},
  {"serviceCatalogId": "94A821E1-D05F-4445-A674-C1F68552D58A", "serviceCode": "64425", "serviceName": "Ilioinguinal Nerve Block", "serviceDescription": "Injection, anesthetic agent; ilioinguinal, iliohypogastric nerves"},
  {"serviceCatalogId": "7CBBB80B-FCC7-4556-A531-C252A7FBE237", "serviceCode": "97139", "serviceName": "Reiki or Energy work", "serviceDescription": "Unlisted therapeutic procedure"},
  {"serviceCatalogId": "8E2631BA-5179-410D-8696-C2B50BE03849", "serviceCode": "97124", "serviceName": "Massage Therapy -60 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "79C9FAF6-A472-4905-A48E-C5E9555C4E8B", "serviceCode": "90853", "serviceName": "Happiness Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "82FBCFD9-99AE-4786-8201-C92565EB533D", "serviceCode": "90837", "serviceName": "Telemed Individual psychotherapy - 60 min", "serviceDescription": "Individual psychotherapy session lasting approximately 60 minutes"},
  {"serviceCatalogId": "968DBF53-32B5-4F8D-BC61-CB727158A6A1", "serviceCode": "99213", "serviceName": "Telemed Care Management", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "1630EBE7-A20E-43E1-93A3-CC433DB89C0D", "serviceCode": "NULL", "serviceName": "Patient Testimony Collection - Video", "serviceDescription": "Patient Testimony Collection - Video"},
  {"serviceCatalogId": "149E2A15-5A85-4C9B-815C-CD2B132ED9AD", "serviceCode": "99487", "serviceName": "Nurse Clinic, Education", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "A9FC419D-B2F2-41EA-8D63-CDA47C723851", "serviceCode": "99487", "serviceName": "Nurse Clinic, Crisis Management", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "4482A752-68B4-4A1F-BF28-CDDD92906E45", "serviceCode": "64484", "serviceName": "TFESI (2nd level)", "serviceDescription": "Transforaminal epidural injection (additional level)"},
  {"serviceCatalogId": "5DAE63E7-D138-4813-95A0-CDE65B2E23B5", "serviceCode": "L1851", "serviceName": "DME Fitting - OA Knee Brace, Unloader (Aspen)", "serviceDescription": "DME Fitting - OA Knee Brace, Unloader (Aspen)"},
  {"serviceCatalogId": "1C466F94-9905-467D-AE74-CE0065563E31", "serviceCode": "20526", "serviceName": "Carpal Tunnel Injection", "serviceDescription": "Injection, therapeutic; carpal tunnel"},
  {"serviceCatalogId": "4FABBF75-416A-4C64-8781-CE4E60B51D78", "serviceCode": "99487", "serviceName": "Nurse Clinic, IV Infusion", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "F180AE84-928B-41BB-B9A0-CE9D3CA400EC", "serviceCode": "97150", "serviceName": "Group Movement Therapy - Upper Body", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "CB70A03A-F757-4A74-B4AA-CF8A78E485F8", "serviceCode": "90875", "serviceName": "Individual Psychotherapy w/ Biofeedback - 30 min", "serviceDescription": "Individual Psychotherapy w/ Biofeedback - 30 min"},
  {"serviceCatalogId": "DFBA388B-BF44-47A3-A741-CFBF1A129766", "serviceCode": "63663", "serviceName": "Spinal Cord Stimulator (SCS) Revision", "serviceDescription": "Revision or replacement of a spinal neurostimulator electrode array (percutaneous)"},
  {"serviceCatalogId": "34103F3B-F994-4369-BEC1-D1F25D3F0142", "serviceCode": "J3301", "serviceName": "Kenalog, 40mg", "serviceDescription": "Injection, Kenalog 40mg (1 cc = 4 unit)"},
  {"serviceCatalogId": "BFDB492C-A7CB-4157-8343-D2481C76C227", "serviceCode": "97804", "serviceName": "Telemed Medical Nutrition Therapy (Group)", "serviceDescription": "Medical nutrition therapy group session for dietary counseling"},
  {"serviceCatalogId": "4322AB64-D6D3-41E7-B933-D2AB12D63210", "serviceCode": "97150", "serviceName": "Group Movement Therapy - Advanced", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "A7DB9C46-90E9-4E4E-81B0-D2D3C3548F73", "serviceCode": "90792", "serviceName": "Behavioral Health Intake w/ Medical Services", "serviceDescription": "Psychiatric diagnostic evaluation with medical services"},
  {"serviceCatalogId": "B8591F90-5D32-4B10-826C-D351728CE6EE", "serviceCode": "20611", "serviceName": "Euflexxa Injection (with US)", "serviceDescription": "Arthrocentesis with ultrasound guidance"},
  {"serviceCatalogId": "0C168095-FE42-40A3-BC1D-D3CFF6ECBCA1", "serviceCode": "99490", "serviceName": "Unit - Care Coordination", "serviceDescription": "Unit - Care Coordination"},
  {"serviceCatalogId": "AC1290A2-0AEA-45CB-A68D-D5885DB83103", "serviceCode": "97032", "serviceName": "Electrical Stimulation (attended)", "serviceDescription": "Application of electrical stimulation to muscles, attended"},
  {"serviceCatalogId": "1794D589-E8F4-479B-B299-D5D6FBC6FB62", "serviceCode": "97803", "serviceName": "Telemed Nutrition Therapy", "serviceDescription": "Telemed Nutrition Therapy"},
  {"serviceCatalogId": "9CF9F553-AE50-45BE-9AB5-D62A8DB449D6", "serviceCode": "99214", "serviceName": "Follow Up Visit - Level 4", "serviceDescription": "Established patient office visit requiring moderate complexity medical decision making"},
  {"serviceCatalogId": "F636C370-3987-47D7-B76B-D6BA62B2AC70", "serviceCode": "90832", "serviceName": "Telemed Individual psychotherapy - 30 min", "serviceDescription": "Individual psychotherapy session lasting approximately 30 minutes"},
  {"serviceCatalogId": "5A120355-DEA5-4725-A4F3-D6C6F952D476", "serviceCode": "97811", "serviceName": "Acupuncture - 30 min", "serviceDescription": "Acupuncture with manual stimulation, each additional 15 minutes"},
  {"serviceCatalogId": "BCF0EF6A-B464-4510-818E-D790CE111572", "serviceCode": "97810", "serviceName": "Moxibustion", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "375B7014-65C6-42C8-8720-D8145B5D6FFE", "serviceCode": "90853", "serviceName": "Group Psychotherapy - General", "serviceDescription": "General"},
  {"serviceCatalogId": "23C338AA-371F-4E78-98D4-D8E75015EB5F", "serviceCode": "97110", "serviceName": "Tai Chi - IND", "serviceDescription": "Therapeutic exercises to develop strength, endurance, and flexibility"},
  {"serviceCatalogId": "50AD2BCB-9912-427E-B47B-DA062CC88335", "serviceCode": "97140", "serviceName": "Manual Lymphatic Drainage (MLD)", "serviceDescription": "Manual therapy techniques including mobilization and manipulation"},
  {"serviceCatalogId": "B63D3AF2-BBD4-48EF-ACDC-DB85F915F1FE", "serviceCode": "99487", "serviceName": "Nurse Clinic, Community Resources Group", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "E7B4B6AA-49C2-43DA-894D-DED996E9B553", "serviceCode": "99245", "serviceName": "Care Review", "serviceDescription": "Comprehensive consultation for complex medical conditions"},
  {"serviceCatalogId": "CD2CF6BF-8747-4673-815A-DEF4133FF164", "serviceCode": "97002", "serviceName": "Unit - Telemed Physical Reconditioning", "serviceDescription": "Physical therapy re-evaluation of established plan of care"},
  {"serviceCatalogId": "ED8E12E2-8729-4AD3-8A43-DFD517099496", "serviceCode": "64636", "serviceName": "Lumbar/Sacral RFA (2nd level)", "serviceDescription": "Radiofrequency ablation, lumbar/sacral (2nd level)"},
  {"serviceCatalogId": "DCDED6B6-D617-4E97-9A2B-E0974314B70A", "serviceCode": "97124", "serviceName": "Light Swedish Massage - 30 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "68439BDE-52C2-486E-A421-E0BAD22E7958", "serviceCode": "20605", "serviceName": "TMJ Injection", "serviceDescription": "Arthrocentesis, aspiration and/or injection; intermediate joint, bursa or ganglion cyst"},
  {"serviceCatalogId": "1965CEC8-6266-4725-B12F-E0F7C5ADB275", "serviceCode": "G9012", "serviceName": "ECM Outreach, In Person, Non-Clinical Staff", "serviceDescription": "ECM Outreach, In Person, Non-Clinical Staff"},
  {"serviceCatalogId": "F35108D0-0599-4B59-9C25-E282FEB5AF1C", "serviceCode": "99213", "serviceName": "Telemed FastRx", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "40D62E2D-1DD5-41AB-8520-E28933D9DC05", "serviceCode": "97039", "serviceName": "Cold Pulse Laser Treatment", "serviceDescription": "Unlisted physical therapy modality"},
  {"serviceCatalogId": "78A5BC89-8826-4E9B-AC42-E2FF3970F11B", "serviceCode": "99213", "serviceName": "Unit - Telemed FastRx", "serviceDescription": "Standard office visit for established patient requiring low to moderate complexity medical decision making"},
  {"serviceCatalogId": "864AAB16-697F-4009-B272-E36D71F7FCBE", "serviceCode": "99202", "serviceName": "New Patient Visit - Level 2", "serviceDescription": "New patient office visit requiring straightforward medical decision making"},
  {"serviceCatalogId": "01EB21E7-9C5E-4CC1-A315-E398D7D5E87D", "serviceCode": "97150", "serviceName": "Group Therapy", "serviceDescription": "Group therapeutic procedures for two or more patients"},
  {"serviceCatalogId": "5C06FF0B-3812-4075-9E99-E42561B2D86C", "serviceCode": "20553", "serviceName": "Trigger Point Injections", "serviceDescription": "Injection(s); single or multiple trigger point(s), 3 or more muscles"},
  {"serviceCatalogId": "357503F5-1BC0-42A4-BD84-E52674F7E065", "serviceCode": "97810", "serviceName": "Acupuncture - 15 min", "serviceDescription": "Acupuncture treatment with manual stimulation, initial 15-minute increment"},
  {"serviceCatalogId": "FEC42751-CA9E-41F8-91A4-E5335FC60E3B", "serviceCode": "20611", "serviceName": "Knee Steroid Injection (with US)", "serviceDescription": "Arthrocentesis with ultrasound guidance"},
  {"serviceCatalogId": "32BB952E-754E-4377-B922-E5DFA5F287D2", "serviceCode": "99245", "serviceName": "Unit - Telemed Medical", "serviceDescription": "Comprehensive consultation for complex medical conditions"},
  {"serviceCatalogId": "1D2052C8-FBA0-4F8C-9D53-E7C9A0B137E9", "serviceCode": "64555", "serviceName": "Peripheral Nerve Simulator (Curonix)", "serviceDescription": "Percutaneous implantation of neurostimulator electrode array for peripheral nerve"},
  {"serviceCatalogId": "E6E72BD6-543D-421D-9C35-E82A40427E7E", "serviceCode": "99490", "serviceName": "Chronic Care Management, First 20 min.", "serviceDescription": "Chronic Care Management, First 20 min."},
  {"serviceCatalogId": "B8536E1E-272E-4FF2-B78B-E933FB2B0140", "serviceCode": "64633", "serviceName": "Cervical/Thoracic RFA", "serviceDescription": "Radiofrequency ablation, cervical/thoracic (1st level)"},
  {"serviceCatalogId": "2A207404-8511-40DB-90F7-EA814E67D694", "serviceCode": "99427", "serviceName": "Principal Care Management (Clinical Staff), Each Addt'l 30 min.", "serviceDescription": "Principal Care Management (Clinical Staff), Each Addt'l 30 min."},
  {"serviceCatalogId": "49F1005D-850D-4F76-8F28-EA831B3AA7F1", "serviceCode": "97124", "serviceName": "Massage Therapy -15 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "65A3FD53-0DCD-4BB2-AD85-EB1A914C2BC2", "serviceCode": "97535", "serviceName": "Self Care/Home Management Training", "serviceDescription": "Self Care/Home Management Training"},
  {"serviceCatalogId": "16751BF7-E2BC-4FEB-A454-EB61AEFADA63", "serviceCode": "20606", "serviceName": "Injection, major joint or bursa", "serviceDescription": "Injection, major joint or bursa (e.g., shoulder, hip, ankle); with ultrasound guidance, with permanent recording"},
  {"serviceCatalogId": "499D68B1-6245-473A-9EA0-EB742D1823D5", "serviceCode": "97803", "serviceName": "Unit - Nutrition Therapy (FU)", "serviceDescription": "For a follow up visit or reassessment in a Unit, face-to-face, 15 minutes per unit"},
  {"serviceCatalogId": "C8B4EFB8-CC1D-4800-9D4D-EBA45E185134", "serviceCode": "64494", "serviceName": "Lumbar/Sacral MBB (2nd level)", "serviceDescription": "Injection, lumbar/sacral facet joint (2nd level)"},
  {"serviceCatalogId": "F0EAA647-354B-4B6A-8EA6-EBA5D00B4C7C", "serviceCode": "22510", "serviceName": "Thoracic Vertebroplasty", "serviceDescription": "Percutaneous vertebroplasty, thoracic"},
  {"serviceCatalogId": "BA33AF5C-9472-44C5-8D16-EDBC712A4ABF", "serviceCode": "64615", "serviceName": "Botox for Migraine", "serviceDescription": "Chemodenervation of muscle(s); muscle innervated by facial, trigeminal, cervical spinal and accessory nerves"},
  {"serviceCatalogId": "A30759A9-3D23-4E33-9534-EFDF3A1645BE", "serviceCode": "64630", "serviceName": "Celiac Plexus Block", "serviceDescription": "Destruction by neurolytic agent; celiac plexus"},
  {"serviceCatalogId": "9C672E79-C1E6-4DDF-924A-EFFC489AFBF9", "serviceCode": "64520", "serviceName": "Sympathetic Nerve Block", "serviceDescription": "Injection, anesthetic agent; lumbar or thoracic sympathetic nerves"},
  {"serviceCatalogId": "438864B8-3DA1-448A-AA27-F00FD95E22DE", "serviceCode": "22869", "serviceName": "Superion? Indirect Decompression System (IDS)", "serviceDescription": "Insertion of an interlaminar/interspinous process stabilization/distraction device"},
  {"serviceCatalogId": "0E9669BE-22C4-4E74-9113-F068C0CE0905", "serviceCode": "X3908", "serviceName": "Group Qi Gong", "serviceDescription": "Group Qi Gong"},
  {"serviceCatalogId": "EF177B35-FFE0-4466-B739-F0867AC3E420", "serviceCode": "64491", "serviceName": "Cervical/Thoracic MBB (2nd level)", "serviceDescription": "Injection, cervical/thoracic facet joint (2nd level)"},
  {"serviceCatalogId": "24BC4F4F-D94B-4564-9745-F20F74A0F84E", "serviceCode": "J1885", "serviceName": "Toradol Injection", "serviceDescription": "Injectable ketorolac tromethamine anti-inflammatory"},
  {"serviceCatalogId": "8F4890D0-DC1E-415F-92C2-F31A398F4540", "serviceCode": "98962", "serviceName": "Health Education", "serviceDescription": "Health Education"},
  {"serviceCatalogId": "D1DA3E5D-62BF-41E1-895C-F31B350EA44A", "serviceCode": "90834", "serviceName": "Telemed Behavioral Health, In Office - 45 min", "serviceDescription": "Individual psychotherapy session lasting approximately 45 minutes"},
  {"serviceCatalogId": "F67AEFEB-D589-4E4E-A920-F386A03816A9", "serviceCode": "64555", "serviceName": "Peripheral Nerve Simulator (Sprint)", "serviceDescription": "Percutaneous implantation of neurostimulator electrode array for peripheral nerve"},
  {"serviceCatalogId": "90A4CA86-E744-4FA7-8FB1-F3952103DB71", "serviceCode": "63661", "serviceName": "Spinal Cord Stimulator (SCS) Explant", "serviceDescription": "Removal of spinal neurostimulator electrode percutaneous array(s)"},
  {"serviceCatalogId": "3B7AEA1B-E2F6-471F-84B4-F476846CA580", "serviceCode": "97016", "serviceName": "Cupping", "serviceDescription": "Vasopneumatic compression device therapy"},
  {"serviceCatalogId": "89C0EB8A-66CC-4EED-A014-F50E489A3C75", "serviceCode": "99490", "serviceName": "Care Coordination", "serviceDescription": "Care Coordination"},
  {"serviceCatalogId": "D12AD748-2A8E-455B-9B48-F584836D7EF5", "serviceCode": "L0457", "serviceName": "DME Fitting - Back Brace (TLSO 0457)", "serviceDescription": "DME Fitting - Back Brace (TLSO 0457)"},
  {"serviceCatalogId": "D3B96BED-BF7F-453C-B9EF-F6201C3658B1", "serviceCode": "90853", "serviceName": "Telemed Group Psychotherapy - Feeding Your Mind", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "0D8ADA76-8858-4429-984C-F704F6E636C6", "serviceCode": "90853", "serviceName": "Grief and Depression Group", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "53B5FF62-B7CD-4CBC-9977-F8A50C1508A2", "serviceCode": "99487", "serviceName": "Nurse Clinic, Injection", "serviceDescription": "Complex chronic care management requiring 60+ minutes per calendar month"},
  {"serviceCatalogId": "F1855E97-831D-448B-AE3B-F8C105D50A84", "serviceCode": "20610", "serviceName": "Trivisc Injection (without US)", "serviceDescription": "Arthrocentesis without ultrasound guidance"},
  {"serviceCatalogId": "3AD4FDC2-EFC3-4F38-999A-F8D0A56327C0", "serviceCode": "64999", "serviceName": "Ganglion Impar Block", "serviceDescription": "Unlisted procedure, nervous system"},
  {"serviceCatalogId": "1982982C-4AAF-464C-89B8-F8E24F052053", "serviceCode": "98940", "serviceName": "Chiropractic Manipulative Treatment (CMT) - Spinal; 1-2 regions", "serviceDescription": "Chiropractic manipulative treatment, spinal 1-2 regions"},
  {"serviceCatalogId": "9CE740E0-B965-4822-8190-F9A1B9A49699", "serviceCode": "20611", "serviceName": "Trivisc Injection (with US)", "serviceDescription": "Arthrocentesis with ultrasound guidance"},
  {"serviceCatalogId": "EDBB8CC0-5D6E-43EA-AC78-F9BE561A18C0", "serviceCode": "99429", "serviceName": "Other Preventive Medicine Services", "serviceDescription": "PAIN3"},
  {"serviceCatalogId": "A1DCEF07-94AD-45D7-A925-FA365747DBFD", "serviceCode": "G9008", "serviceName": "ECM Outreach, Telemed, Clinical Staff", "serviceDescription": "ECM Outreach, Telemed, Clinical Staff"},
  {"serviceCatalogId": "2B6B56D2-2778-41FC-860E-FA4F09E58CFB", "serviceCode": "97124", "serviceName": "Light Swedish Massage - 15 minutes", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "F65A5A68-2940-4137-A421-FA5D8A975EA4", "serviceCode": "97003", "serviceName": "Iontophoresis", "serviceDescription": "Occupational therapy evaluation"},
  {"serviceCatalogId": "21454AC0-E041-43A5-A266-FB27BD653DBC", "serviceCode": "90853", "serviceName": "Telemed Group Psychotherapy - Habits and Addictions", "serviceDescription": "Group psychotherapy session for behavioral health treatment"},
  {"serviceCatalogId": "D7C96BC0-F1E1-404B-9BAF-FBD90B15191C", "serviceCode": "97012", "serviceName": "Mechanical Traction", "serviceDescription": "Mechanical traction therapy to relieve pain and decompress structures"},
  {"serviceCatalogId": "05A846EF-59C7-4B58-8E51-FD04234EEF4F", "serviceCode": "L1902", "serviceName": "DME Fitting - Ankle", "serviceDescription": "DME Fitting - Ankle"},
  {"serviceCatalogId": "4E28F706-D083-4BFB-914A-FD8243E5F5DF", "serviceCode": "J1030", "serviceName": "Methylprednisolone", "serviceDescription": "Injection, Methylprednisolone (4 units = 1 single vial)"},
  {"serviceCatalogId": "780DA81D-BE09-4D69-B963-FDF5B4914237", "serviceCode": "97124", "serviceName": "Deep Tissue Massage", "serviceDescription": "Therapeutic massage procedure for soft tissue mobilization"},
  {"serviceCatalogId": "FE173D01-4D6F-48B0-BB83-FE6AFD8ACED1", "serviceCode": "62218", "serviceName": "Suprascapular Nerve Block", "serviceDescription": "Injection, spinal cord or nerve root; therapeutic"},
  {"serviceCatalogId": "F86ECEB5-7BE6-4418-BDFA-FF1CD1560FD8", "serviceCode": "20611", "serviceName": "Shoulder Steroid Injection (with US)", "serviceDescription": "Arthrocentesis with ultrasound guidance"},
  {"serviceCatalogId": "A2AD0197-0056-43F8-AB15-FFE7D2D24D9D", "serviceCode": "99201", "serviceName": "New Patient Visit - Level 1", "serviceDescription": "New patient brief office visit"}
];

// Tools definition for OpenAI
const tools = [
  {
    type: "function",
    name: "handle_care_unit_action",
    description: "Add, update, or delete a care action. Extract the operation and describe the service the user mentioned. Do NOT guess CPT codes - just describe what the user said.",
    parameters: {
      type: "object",
      properties: {
        provider_id: {
          type: "string",
          description: "Provider UserNum (UUID) performing the action"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        },
        operation: {
          type: "string",
          enum: ["add", "update", "delete"],
          description: "Type of operation"
        },
        service_description: {
          type: "string",
          description: "Natural language description of the service spoken by the user (e.g., 'chiropractic treatment 3 regions', 'office visit', 'urine drug screening', 'behavioral health intake')"
        }
      },
      required: ["provider_id", "provider_name", "operation", "service_description"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "update_ghs_score",
    description: "Update a Global Health Score category. Map the spoken value to the correct category and score value (1, 2, or 3).",
    parameters: {
      type: "object",
      properties: {
        provider_id: {
          type: "string",
          description: "Provider UserNum (UUID) making the update"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        },
        category: {
          type: "string",
          enum: ["PScoreBody", "PScoreInteractivity", "PScoreMind", "PScoreMotivation", "PScoreResponse", "PScoreSocVulnerability", "PScoreSubstance"],
          description: "GHS category to update"
        },
        value: {
          type: "string",
          description: "The spoken value — can be a number (1/2/3), color (green/yellow/red), level (low/medium/high), letter (A/B/C), shape (circle/square/triangle), or descriptor (good/cooperative/moderate/challenging/difficult/poor)"
        }
      },
      required: ["provider_id", "provider_name", "category", "value"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "open_imaging_results",
    description: "Open patient imaging results by date. Parse dates from natural language like 'August 2025', 'June 22nd', 'August 17th 2025', etc.",
    parameters: {
      type: "object",
      properties: {
        provider_id: {
          type: "string",
          description: "Provider UserNum (UUID) making the request"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        },
        order_date: {
          type: "string",
          description: "Order date in YYYY-MM-DD format parsed from user's natural language input"
        },
        spoken_date: {
          type: "string",
          description: "The original date phrase spoken by the user (e.g., 'August 2025', 'June 22nd')"
        }
      },
      required: ["provider_id", "provider_name", "order_date", "spoken_date"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "start_scrum",
    description: "Start the scrum meeting. This will trigger the UI to begin the scrum session.",
    parameters: {
      type: "object",
      properties: {
        provider_id: { 
          type: "string",
          description: "Provider UserNum (UUID) starting the scrum"
        },
        provider_name: {
          type: "string",
          description: "Provider name"
        }
      },
      required: ["provider_id", "provider_name"],
      additionalProperties: false
    },
    strict: true
  },
  {
  type: "function",
  name: "close_ui_element",
  description: "Close any open UI element (modal, image, report, document, xray, etc.) regardless of what the user says. Trigger on ANY close-related phrase: 'close it', 'close this', 'close the window', 'close xray', 'close', 'dismiss', etc.",
  parameters: {
    type: "object",
    properties: {
      provider_id: {
        type: "string",
        description: "Provider UserNum (UUID)"
      },
      provider_name: {
        type: "string",
        description: "Provider name"
      },
      element_type: {
        type: "string",
        description: "What the user said to close (e.g., 'it', 'window', 'xray', 'report') - UI will close whatever is currently open"
      }
    },
    required: ["provider_id", "provider_name", "element_type"],
    additionalProperties: false
  },
  strict: true
},

  {
  type: "function",
  name: "brief_patient_document",
  description: "Brief/summarize a patient document (UDS, lab report, MRI report, X-ray report, etc.). The provider asks L.I.N.A. to read or brief a document. Use the document_id from the documents listed in the patient context.",
  parameters: {
    type: "object",
    properties: {
      provider_id: {
        type: "string",
        description: "Provider UserNum (UUID)"
      },
      provider_name: {
        type: "string",
        description: "Provider name"
      },
      document_id: {
        type: "string",
        description: "Document GUID from the patient context documents list"
      },
      document_name: {
        type: "string",
        description: "Document name as listed in context (e.g., 'MRI Cervical Spine without contrast')"
      }
    },
    required: ["provider_id", "provider_name", "document_id", "document_name"],
    additionalProperties: false
  },
  strict: true
},

{
  type: "function",
  name: "show_patient_document",
  description: "Display a patient document on screen. The provider asks to see/show/display/view a document (UDS, MRI, X-ray, report, scan, etc.). Use the document_id from the documents listed in the patient context.",
  parameters: {
    type: "object",
    properties: {
      provider_id: {
        type: "string",
        description: "Provider UserNum (UUID)"
      },
      provider_name: {
        type: "string",
        description: "Provider name"
      },
      document_id: {
        type: "string",
        description: "Document GUID from the patient context documents list"
      },
      document_name: {
        type: "string",
        description: "Document name as listed in context (e.g., 'MRI Cervical Spine without contrast')"
      }
    },
    required: ["provider_id", "provider_name", "document_id", "document_name"],
    additionalProperties: false
  },
  strict: true
},

  {
  type: "function",
  name: "approve_action",
  description: "Approve a pending action or decision.",
  parameters: {
    type: "object",
    properties: {
      provider_id: { 
        type: "string",
        description: "Provider UserNum (UUID) approving the action"
      },
      provider_name: {
        type: "string",
        description: "Provider name"
      },
      action_description: {
        type: "string",
        description: "Description of what is being approved"
      }
    },
    required: ["provider_id", "provider_name", "action_description"],
    additionalProperties: false
  },
  strict: true
}
];

module.exports = {
  tools,
  CPT_CODES 
};