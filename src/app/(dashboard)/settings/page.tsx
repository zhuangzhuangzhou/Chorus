"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKey {
  uuid: string;
  keyPrefix: string;
  name: string | null;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
  roles: string[];
}

// PM Agent Persona presets
const PM_PERSONAS = [
  {
    id: "dev_pm",
    label: "Dev-focused PM",
    description:
      "You are a product manager who prioritizes developer experience and builds developer-first products. You understand technical constraints and communicate effectively with engineering teams.",
  },
  {
    id: "full_pm",
    label: "Full-fledged PM",
    description:
      "You are a comprehensive product manager with the mindset of building products that solve real problems for your target audience. You balance business goals, user needs, and technical feasibility.",
  },
  {
    id: "simple_pm",
    label: "Simple PM",
    description:
      "You are a focused product manager who prioritizes core features first, avoiding over-engineering. You believe in shipping fast, gathering feedback, and iterating quickly.",
  },
];

// Developer Agent Persona presets
const DEV_PERSONAS = [
  {
    id: "senior_dev",
    label: "Senior Developer",
    description:
      "You are a senior software developer with extensive experience in building scalable systems. You write clean, maintainable code and follow best practices. You mentor junior developers and make architectural decisions.",
  },
  {
    id: "fullstack_dev",
    label: "Full-stack Developer",
    description:
      "You are a versatile full-stack developer comfortable working across the entire stack. You can build APIs, design databases, and create responsive UIs. You prioritize user experience and performance.",
  },
  {
    id: "pragmatic_dev",
    label: "Pragmatic Developer",
    description:
      "You are a practical developer who focuses on delivering working solutions quickly. You avoid premature optimization, write tests for critical paths, and prefer simple solutions over complex abstractions.",
  },
];

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customPersona, setCustomPersona] = useState("");

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/api-keys", {
        headers: { "x-user-id": "1", "x-company-id": "1" },
      });
      const data = await response.json();
      if (data.success) {
        const keys = data.data.map(
          (key: ApiKey & { agent?: { roles: string[] } }) => ({
            ...key,
            roles: key.agent?.roles || [],
          })
        );
        setApiKeys(keys);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const selectPersonaPreset = (description: string) => {
    setCustomPersona(description);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || selectedRoles.length === 0) return;

    setSubmitting(true);
    try {
      // First create an agent with the specified roles and persona
      const agentResponse = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-company-id": "1",
        },
        body: JSON.stringify({
          name: newKeyName,
          roles: selectedRoles,
          persona: customPersona || null,
        }),
      });
      const agentData = await agentResponse.json();

      if (!agentData.success) {
        console.error("Failed to create agent:", agentData.error);
        return;
      }

      // Then create an API key for the agent
      const keyResponse = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-company-id": "1",
        },
        body: JSON.stringify({
          agentUuid: agentData.data.uuid,
          name: newKeyName,
        }),
      });
      const keyData = await keyResponse.json();

      if (keyData.success) {
        setCreatedKey(keyData.data.key);
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      const response = await fetch(`/api/api-keys/${uuid}`, {
        method: "DELETE",
        headers: { "x-user-id": "1", "x-company-id": "1" },
      });
      const data = await response.json();
      if (data.success) {
        setApiKeys(apiKeys.filter((k) => k.uuid !== uuid));
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setNewKeyName("");
    setSelectedRoles([]);
    setCustomPersona("");
    setCreatedKey(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Get available persona presets based on selected roles
  const getAvailablePersonas = () => {
    const personas: { id: string; label: string; description: string }[] = [];
    if (selectedRoles.includes("pm_agent")) {
      personas.push(...PM_PERSONAS);
    }
    if (selectedRoles.includes("developer_agent")) {
      personas.push(...DEV_PERSONAS);
    }
    return personas;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-xs text-[#9A9A9A]">Chorus / Settings</div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">Settings</h1>
        <p className="mt-1 text-[13px] text-[#6B6B6B]">
          Manage your account and agent configurations
        </p>
      </div>

      {/* Agents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#2C2C2C]">Agents</h2>
          <Button
            onClick={() => setShowModal(true)}
            className="gap-2 bg-[#C67A52] text-white hover:bg-[#B56A42]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create API Key
          </Button>
        </div>

        <p className="text-[13px] text-[#6B6B6B]">
          Create API keys to allow your personal agents to access Chorus. Each
          key can be assigned different roles.
        </p>

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <div className="rounded-xl border border-[#E5E0D8] bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F2EC]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-[#9A9A9A]"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <p className="text-sm text-[#6B6B6B]">
              No API keys yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.uuid}
                className="rounded-xl border border-[#E5E0D8] bg-white p-5"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        key.roles.includes("developer_agent")
                          ? "bg-[#E8F5E9]"
                          : "bg-[#FFF3E0]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-[18px] w-[18px] ${
                          key.roles.includes("developer_agent")
                            ? "text-[#5A9E6F]"
                            : "text-[#E65100]"
                        }`}
                      >
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#2C2C2C]">
                        {key.name || key.keyPrefix + "..."}
                      </div>
                      <div className="text-xs text-[#9A9A9A]">
                        {key.keyPrefix}... · Created{" "}
                        {new Date(key.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(key.keyPrefix + "...")}
                      className="rounded-md border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium text-[#6B6B6B] hover:bg-[#F5F2EC]"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.uuid)}
                      className="rounded-md border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium text-[#C4574C] hover:bg-[#FFEBEE]"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Roles Row */}
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-xs text-[#6B6B6B]">Roles:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded ${
                        key.roles.includes("developer_agent")
                          ? "bg-[#C67A52]"
                          : "border-2 border-[#E5E0D8]"
                      }`}
                    >
                      {key.roles.includes("developer_agent") && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-xs ${key.roles.includes("developer_agent") ? "text-[#2C2C2C]" : "text-[#6B6B6B]"}`}
                    >
                      Developer Agent
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded ${
                        key.roles.includes("pm_agent")
                          ? "bg-[#C67A52]"
                          : "border-2 border-[#E5E0D8]"
                      }`}
                    >
                      {key.roles.includes("pm_agent") && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-xs ${key.roles.includes("pm_agent") ? "text-[#2C2C2C]" : "text-[#6B6B6B]"}`}
                    >
                      PM Agent
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25">
          <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-xl">
            {createdKey ? (
              // Success State
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 text-[#5A9E6F]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className="font-medium">API Key Created</span>
                </div>
                <p className="mb-4 text-sm text-[#6B6B6B]">
                  Copy this key now. You won&apos;t be able to see it again!
                </p>
                <div className="mb-4 flex items-center gap-2">
                  <code className="flex-1 rounded bg-[#2C2C2C] px-3 py-2 font-mono text-sm text-white">
                    {createdKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdKey)}
                    className="border-[#E5E0D8]"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Button onClick={closeModal} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              // Form State
              <form onSubmit={handleCreateKey}>
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#F5F2EC] px-6 py-5">
                  <h3 className="text-lg font-semibold text-[#2C2C2C]">
                    Create API Key
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F5F2EC]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-[#6B6B6B]"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="space-y-5 p-6">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="keyName" className="text-[13px]">
                      Name
                    </Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="My Agent Key"
                      className="border-[#E5E0D8]"
                      required
                    />
                  </div>

                  {/* Agent Roles */}
                  <div className="space-y-3">
                    <Label className="text-[13px]">Agent Roles</Label>
                    <p className="text-xs text-[#9A9A9A]">
                      Select the roles this API key has access to.
                    </p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleRole("developer_agent")}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                          selectedRoles.includes("developer_agent")
                            ? "border-[#C67A52] bg-[#FFFBF8]"
                            : "border-[#E5E0D8] hover:border-[#C67A52]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded ${
                            selectedRoles.includes("developer_agent")
                              ? "bg-[#C67A52]"
                              : "border-2 border-[#E5E0D8]"
                          }`}
                        >
                          {selectedRoles.includes("developer_agent") && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#2C2C2C]">
                            Developer Agent
                          </div>
                          <div className="text-xs text-[#6B6B6B]">
                            Execute tasks, write code, report issues, commits
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRole("pm_agent")}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                          selectedRoles.includes("pm_agent")
                            ? "border-[#C67A52] bg-[#FFFBF8]"
                            : "border-[#E5E0D8] hover:border-[#C67A52]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded ${
                            selectedRoles.includes("pm_agent")
                              ? "bg-[#C67A52]"
                              : "border-2 border-[#E5E0D8]"
                          }`}
                        >
                          {selectedRoles.includes("pm_agent") && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#2C2C2C]">
                            PM Agent
                          </div>
                          <div className="text-xs text-[#6B6B6B]">
                            Analyze requirements, write proposals, manage tasks
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Agent Persona - Always visible */}
                  <div className="space-y-3">
                    <Label className="text-[13px]">Agent Persona</Label>
                    <p className="text-xs text-[#9A9A9A]">
                      {selectedRoles.length > 0
                        ? "Select a preset or write your own persona. This defines how the agent behaves in all interactions."
                        : "Define how this agent should behave in all interactions."}
                    </p>

                    {/* Persona Presets - Only show when roles are selected */}
                    {selectedRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {getAvailablePersonas().map((persona) => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() =>
                              selectPersonaPreset(persona.description)
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              customPersona === persona.description
                                ? "border-[#C67A52] bg-[#C67A52] text-white"
                                : "border-[#E5E0D8] text-[#6B6B6B] hover:border-[#C67A52]"
                            }`}
                          >
                            {persona.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Editable Persona Textarea - Always visible */}
                    <textarea
                      value={customPersona}
                      onChange={(e) => setCustomPersona(e.target.value)}
                      placeholder="Describe how this agent should behave. For example: 'You are a helpful assistant that focuses on clarity and simplicity...'"
                      rows={4}
                      className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] placeholder:text-[#9A9A9A] focus:border-[#C67A52] focus:outline-none focus:ring-1 focus:ring-[#C67A52]"
                    />
                    <p className="text-[11px] text-[#9A9A9A]">
                      {selectedRoles.length > 0
                        ? "You can edit the text above or write your own custom persona."
                        : "Write a custom persona for your agent."}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 border-t border-[#F5F2EC] px-6 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="border-[#E5E0D8]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !newKeyName || selectedRoles.length === 0 || submitting
                    }
                    className="bg-[#C67A52] text-white hover:bg-[#B56A42]"
                  >
                    {submitting ? "Creating..." : "Create API Key"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
