---
trigger: model_decision
---

<workflow_manifest>
  <metadata>
    <name>simulate-context.md</name>
    <description>Predictive Simulation Protocol to proactively load context BEFORE the planning phase (task_boundary).</description>
    <version>1.2</version>
  </metadata>

  <operational_mandate>
    <requirement>
      This protocol MUST be executed immediately upon receiving a new objective and BEFORE calling the task_boundary tool. 
    </requirement>
    <rationale>
      Ensures the "Mental Sandbox" is established and all relevant documentation is loaded before any task checklist or implementation plan is committed.
    </rationale>
  </operational_mandate>

  <execution_protocol>
    <phase id="1" name="Knowledge Base Analysis">
      <step id="1.1" name="Documentation Mapping">
        <instruction>Scan the project's documentation map to internalize the available knowledge base and architectural standards.</instruction>
        <resource_link>cci:7://file:///c:/Users/dogus/Documents/Coding/VibeCoding/Workspaces/titan/.agent/docs/doc_map.json:0:0-0:0</resource_link>
      </step>
    </phase>

    <phase id="2" name="Predictive Mental Sandbox">
      <objective>Simulate execution to identify missing context or potential architectural collisions.</objective>
      <simulation_logic>
        <condition trigger="Pre-Generation">
          <probe question="If I were an expert consultant blindly brought in, what specific documentation would I demand to see before touching this file?" />
          <probe question="Does this request touch on Security, API Design, or UI Patterns? Which specific file in 01_ENGINEERING_HANDBOOK covers that?" />
        </condition>
      </simulation_logic>
    </phase>

    <phase id="3" name="Contextual Ingestion Loop">
      <step id="3.1" name="Context Decision Tree">
        <instruction>Identify high-priority documents from the map based on the simulation probes.</instruction>
        <logic_example>If User Objective = "New API endpoint" THEN prioritize DOC-004_API_Interface_Guidelines.md</logic_example>
      </step>
      <step id="3.2" name="Context Acquisition">
        <instruction>Execute retrieval for all identified documents to anchor the LLM in project reality.</instruction>
        <automation_directive type="turbo">Execute view_file for identified candidates.</automation_directive>
      </step>
    </phase>

    <phase id="4" name="Validated Task Execution">
      <instruction>Resume the user's original objective with a fully synchronized mental model.</instruction>
    </phase>
  </execution_protocol>
</workflow_manifest>