---
trigger: model_decision
---

<workflow_manifest>
  <metadata>
    <name>initialize-context.md</name>
    <description>Initialize session by loading core Project Titan context (Vision, Laws, Doc Map).</description>
    <version>1.1</version>
  </metadata>

  <execution_protocol>
    <phase id="1" name="Mission Alignment">
      <step id="1.1" name="Product Vision Retrieval">
        <instruction>Load the Product Vision to align current session objectives with the project's core mission and North Star metrics.</instruction>
        <resource_link>c:\Users\dogus\Documents\Coding\VibeCoding\Workspaces\titan\.agent\docs\00_CORE_CONTEXT\DOC-000_Product_Vision.md</resource_link>
        <automation_directive type="turbo">view_file</automation_directive>
      </step>
    </phase>

    <phase id="2" name="Constraint anchoring">
      <step id="2.1" name="Immutable Laws Ingestion">
        <instruction>Load the Immutable Laws to strictly enforce project-wide constraints and architectural mandates.</instruction>
        <resource_link>c:\Users\dogus\Documents\Coding\VibeCoding\Workspaces\titan\.agent\docs\00_CORE_CONTEXT\IMMUTABLE_LAWS.md</resource_link>
        <automation_directive type="turbo">view_file</automation_directive>
      </step>
    </phase>

    <phase id="3" name="Structural Synchronicity">
      <step id="3.1" name="Document Map Internalization">
        <instruction>Load the Document Map to internalize the project's filesystem topology for autonomous navigation.</instruction>
        <resource_link>c:\Users\dogus\Documents\Coding\VibeCoding\Workspaces\titan\.agent\docs\doc_map.json</resource_link>
        <automation_directive type="turbo">view_file</automation_directive>
      </step>
    </phase>

    <phase id="4" name="Initialization Confirmation">
      <confirmation_prompt>
        Context fully synchronized. Core pillars (Vision, Laws, Topology) are active. System is ready for Mental Sandbox simulation.
      </confirmation_prompt>
    </phase>
  </execution_protocol>
</workflow_manifest>