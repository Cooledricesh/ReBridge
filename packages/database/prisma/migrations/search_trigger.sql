-- 전문 검색을 위한 트리거 함수 생성 (simple configuration 사용)
CREATE OR REPLACE FUNCTION update_job_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.company, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS jobs_search_vector_update ON jobs;
CREATE TRIGGER jobs_search_vector_update
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW 
EXECUTE FUNCTION update_job_search_vector();

-- 기존 데이터에 대한 search_vector 업데이트
UPDATE jobs SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(company, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;

-- GIN 인덱스 생성 (이미 스키마에 정의되어 있지만 명시적으로 추가)
CREATE INDEX IF NOT EXISTS jobs_search_idx ON jobs USING GIN(search_vector);

-- 추가 인덱스들
CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs(source);
CREATE INDEX IF NOT EXISTS jobs_expires_at_idx ON jobs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_disability_friendly_idx ON jobs(is_disability_friendly) WHERE is_disability_friendly = true;
CREATE INDEX IF NOT EXISTS user_saved_jobs_user_idx ON user_saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS crawl_logs_started_at_idx ON crawl_logs(started_at DESC);