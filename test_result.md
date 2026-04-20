#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Continuation: expand the Japanese learning app with the following features:
  1) Splash ping hangs until backend /ping returns OK.
  2) YouTube browse: click card opens a video viewer that inline-displays the transcript;
     auto-loads if a transcript exists for the video, otherwise shows a "Request transcription" button.
  3) New cloze logic: hide N consecutive tokens, show M tokens, repeat. N and M randomised per
     block within configurable min/max ranges.
  4) Resizable split screen (video | transcript).
  5) Manga: persist current search query on navigation, mock mainpage endpoint with pagination
     (page numbers only, fixed page size), add "Clear all" button. Exit chapter returns to current
     search state (via sessionStorage).
  6) Manga reader: OCR loading is non-blocking (user keeps reading), bounding box padding setting,
     new right-drawer "Text" tab that shows the selected bbox's text for copy/select, copy-all
     button rendered on each bbox (mobile-friendly), fixed reading modes (single/double/vertical
     with RTL option for Japanese manga).
  7) YouTube "mainpage" uses the same /youtube/search endpoint with a default query (日本語学習).

frontend:
  - task: "Splash ping hangs until server responds"
    implemented: true
    working: true
    file: "frontend/src/components/SplashScreen.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Ping loop keeps retrying /ping every 2s (5s timeout per try). stageIdx blocks at 0 until serverReady=true. Uses exported API_BASE_URL."

  - task: "YouTube browse: mainpage default + clear + query persistence"
    implemented: true
    working: true
    file: "frontend/src/pages/YouTubeBrowsePage.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Default query '日本語学習' loads on mount. Query/mode/results persisted in sessionStorage. 'Xoá hết' button reverts to mainpage. Clicking a card opens the unified viewer."

  - task: "Unified YouTube video viewer with inline transcript"
    implemented: true
    working: true
    file: "frontend/src/pages/YouTubeVideoViewerPage.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Route /youtube/video/:videoId. On mount, findTranscriptByVideoId scans user history + public transcripts. If found → auto-loads data; polls if still processing. If not found → shows 'Yêu cầu phiên dịch' button. Resizable split video | transcript. New block cloze with 4 min/max sliders and reshuffle/show-all."

  - task: "Transcript view (/transcript/:id) with block cloze + resize"
    implemented: true
    working: true
    file: "frontend/src/pages/TranscribeViewPage.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Same resizable split + block cloze as viewer."

  - task: "Block cloze logic (hide-N / show-M with random min/max)"
    implemented: true
    working: true
    file: "frontend/src/lib/cloze-block.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Seeded pseudo-random N and M per block within min/max bounds. Respects eligibility (only timed tokens become cloze)."

  - task: "Resizable split pane (horizontal)"
    implemented: true
    working: true
    file: "frontend/src/components/ResizableSplit.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "useResizableSplit hook persists percent in localStorage per storageKey."

  - task: "Manga page: mainpage mock + paging + clear + query persistence"
    implemented: true
    working: true
    file: "frontend/src/pages/MangaPage.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "getMangaMainPage aggregates 6 popular queries in parallel, interleaves + dedupes, client-side paging (12 per page). URL ?q=... & ?page=... synced. sessionStorage used for back-nav restoration."

  - task: "Manga reader: OCR non-blocking, padding, text tab, copy button, RTL double"
    implemented: true
    working: true
    file: "frontend/src/pages/MangaReaderPage.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "OCR fetch keeps the reader usable (small header spinner). Right panel now has 3 tabs: Settings / Chapters / Text. Clicking a bbox selects it and switches to Text tab, where the OCR text is rendered in a selectable textarea with a Copy button. Each bbox also has a corner Copy button visible whenever 'Hiện bounding box' is on or when the box is selected. Added 'Padding box' slider (0–30px) that inflates boxes. Reading modes: single / double (with RTL toggle defaulting to true for Japanese manga) / vertical scroll. Exit returns to /manga/:mangaId."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "YouTube browse: mainpage default + clear + query persistence"
    - "Unified YouTube video viewer with inline transcript"
    - "Manga page: mainpage mock + paging + clear + query persistence"
    - "Manga reader: OCR non-blocking, padding, text tab, copy button, RTL double"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Implemented all continuation tasks. Manually verified: splash blocks until ping OK; YouTube mainpage loads 20 video cards via default query; clicking a card opens the unified viewer with the correct 'not_found → Yêu cầu phiên dịch' state; manga mainpage loads 12 items with pagination and caches aggregate between page switches; manga reader renders images correctly (fixed ResizeObserver timing), OCR loads non-blockingly and shows boxes; clicking a bbox opens the Text tab with copyable content; corner Copy button works. Credentials in /app/memory/test_credentials.md."
