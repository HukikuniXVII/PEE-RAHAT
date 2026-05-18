-- Past-stats system removed entirely. CUPT data has more variance than is
-- worth modelling at this stage (duplicate (courseCode, year, round) rows
-- under sub-tracks + joint admissions, dirty cells, summary rows with no
-- quota). The criteria importer + what-if calculator remain.
--
-- TcasImportAudit stays — it still records criteria imports. Its `kind`
-- column will only ever be 'criteria' going forward.

DROP TABLE "TcasProgramStat";
