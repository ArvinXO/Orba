'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, BookOpen, Scale, AlertTriangle, CheckCircle2, Search, FileText,
    Info, GraduationCap, ChevronRight, Lock, Unlock, Gavel, Hammer,
    Landmark, Map as MapIcon, LogOut, Zap, Users, Target, Activity, Award,
    Fingerprint, Building2, UserCheck, Eye, HelpCircle, HardHat, Siren,
    SearchCode, Briefcase, BookMarked, Radio, MessageSquare, AlertCircle,
    UserCircle2, ShieldAlert, FileSearch, Scale3D, Clock, BrainCircuit,
    Terminal, Database, History, ChevronDown, ListChecks, ArrowRight,
    Crosshair
} from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

// --- SERVICE INTERFACES ---

type PowerCategory = 'SEARCH' | 'FORCE' | 'ENTRY' | 'PUBLIC_ORDER' | 'DETENTION' | 'TRAFFIC' | 'ARREST' | 'TACTICAL';

interface LegislationExtract {
    act: string;
    section: string;
    wording: string;
    interpretation: string;
}

interface ScenarioOption {
    label: string;
    nextStageId?: string;
    act?: string;
    section?: string;
    isCorrect?: boolean;
    rationale?: string;
    ndmNote?: string;
    thriveNote?: string;
    controlResponse?: string;
    unlockedInfo?: string;
}

interface ScenarioStage {
    id: string;
    description: string;
    actor?: {
        name: string;
        role: string;
        dialogue: string;
    };
    intel?: string;
    options: ScenarioOption[];
}

interface Scenario {
    id: number;
    category: PowerCategory;
    title: string;
    description: string;
    type: 'CURRICULUM' | 'DYNAMIC';
    stages?: Record<string, ScenarioStage>;
    initialStageId?: string;
    scenario?: string;
    extract?: LegislationExtract;
    options?: ScenarioOption[];
}

interface PolicePowersProps {
    username: string;
    onExit: () => void;
}

// --- CURRICULUM DATA: THE SERVICE LIBRARY ---

const ALL_SCENARIOS: Scenario[] = [
    {
        id: 101,
        category: 'TACTICAL',
        title: "Op Nightingale: High-Risk Stop",
        description: "Apply NDM/THRIVE to a suspicious vehicle encounter with high-risk markers.",
        type: 'DYNAMIC',
        initialStageId: 'approach',
        stages: {
            'approach': {
                id: 'approach',
                description: "You're single-crewed. An Audi RS6 is idling behind a jeweler at 03:00. Tinted glass, engine running. Thermal shows 4 distinct heat signatures inside.",
                intel: "NCAD Marker: Involved in Armed Robbery (S. London) 48hrs ago.",
                options: [
                    { label: "Request Specialist Firearms (SFO) Support", nextStageId: 'sfo_request', controlResponse: "Control: 'Acknowledged. Trojan unit dispatched. ETA 4 mins. Do not approach.'" },
                    { label: "Activate Blues & Twoes and block the exit", nextStageId: 'hard_block', rationale: "Tactically unsound. Blocking a high-risk vehicle alone invites a ramming attempt or firearms engagement without lethal cover." },
                    { label: "Strategic observation from safe distance", nextStageId: 'sfo_request' }
                ]
            },
            'sfo_request': {
                id: 'sfo_request',
                description: "Trojan units are en route. A passenger exits the vehicle. He's wearing a balaclava. He spots you and begins to reach into his waistband while moving towards the jewelry store rear door.",
                actor: { name: "Suspect 1", role: "Passenger", dialogue: "Maintains eye contact, hand submerged in waistband, stepping back." },
                options: [
                    { label: "Issue 'Armed Police' challenge", nextStageId: 'final_check', thriveNote: "THRIVE: Immediate risk to life if he's armed. However, you are unarmed. A challenge may accelerate his response." },
                    { label: "Stay behind engine block and update Control", nextStageId: 'final_check', ndmNote: "Step 4: Options. Staying at safe cover reduces risk while SFO is imminent. Protecting yourself is the priority." }
                ]
            },
            'final_check': {
                id: 'final_check',
                description: "The suspect drops a heavy object. SFO units have arrived and are performing a hard stop on the vehicle. The male is on the ground. You need to secure the dropped item.",
                options: [
                    { label: "Secure item as evidence immediately", isCorrect: true, rationale: "Correct. Once SFO has secured the subjects, your role shifts to forensics and scene management (s.19 PACE).", act: "PACE 1984", section: "19" },
                    { label: "Chase the driver who is still in the car", isCorrect: false, rationale: "Unsafe. Let the SFO units deal with the vehicle and its remaining occupants using their specialized tactics." }
                ]
            }
        }
    },
    {
        id: 102,
        category: 'TACTICAL',
        title: "Op Sector: Protest Response",
        description: "Managing a spontaneous public order incident at a major landmark.",
        type: 'DYNAMIC',
        initialStageId: 'incident_start',
        stages: {
            'incident_start': {
                id: 'incident_start',
                description: "A group of 30 activists have blocked a major junction. Traffic is backed up for miles. They are chanting and sitting in the road. No 'responsible person' is identified.",
                options: [
                    { label: "Initiate s.12/14 Public Order Act conditions", nextStageId: 'conditions', controlResponse: "Control: 'Inspector authorization required for s.12/14. We are contacting the Duty Officer now.'" },
                    { label: "Engage in dialogue to move them", nextStageId: 'dialogue' }
                ]
            },
            'dialogue': {
                id: 'dialogue',
                description: "You speak to the front line. One individual is very vocal. 'We aren't moving until the government acts!' The crowd is becoming restless as drivers start shouting and exiting cars.",
                actor: { name: "Protester B", role: "Vocal Activist", dialogue: "We have a right to protest! You can't touch us!" },
                options: [
                    { label: "Issue s.14 formal warning", nextStageId: 'conditions', thriveNote: "THRIVE: Risk of public disorder/violence between drivers and protesters is increasing." },
                    { label: "Physical removal (s.117 PACE)", nextStageId: 'conditions', rationale: "Using force without a clear legal condition (s.14) or immediate breach of peace may be unproportional." }
                ]
            },
            'conditions': {
                id: 'conditions',
                description: "Inspector grants s.14 conditions: 'Protest to move to the side pavement'. You must communicate this clearly.",
                options: [
                    { label: "Communicate condition and set time limit", isCorrect: true, rationale: "Correct. For a s.14 condition to be enforceable (curtailing ECHR Art 10/11), it must be clearly communicated and have a reasonable timeframe.", act: "Public Order Act 1986", section: "14" },
                    { label: "Immediately arrest everyone on the road", isCorrect: false, rationale: "Failure. You must first set the conditions and allow a reasonable opportunity for compliance before enforcing arrest." }
                ]
            }
        }
    },
    {
        id: 1,
        category: 'SEARCH',
        title: "Code A: Reasonable Suspicion",
        description: "Navigating the complexities of PACE s.1 search grounds in a retail environment.",
        type: 'CURRICULUM',
        scenario: "You observe a male walking through a shopping center. He appears nervous and checks his surroundings frequently. He is carrying a designer bag which looks heavy. Do you have grounds to search?",
        extract: {
            act: "PACE 1984",
            section: "Code A",
            wording: "Reasonable suspicion can never be supported on the basis of personal factors... It must be based on objective information.",
            interpretation: "Behavior + Information = Grounds. Nervousness alone is a low-quality factor. You need 'suspicious activity' related to prohibited articles."
        },
        options: [
            {
                label: "Stop & speak to build objective suspicion",
                act: "PACE 1984",
                section: "Code A",
                isCorrect: true,
                rationale: "Correct. G.O.W.I.S.E. starts with interaction. Building a picture through questioning is the professional standard for objective suspicion (PLAN protocol)."
            },
            {
                label: "Execute immediate search for stolen goods",
                act: "PACE 1984",
                section: "s.1",
                isCorrect: false,
                rationale: "Failure. Nervousness and a 'heavy bag' do not constitute reasonable grounds for search without further objective evidence of crime (e.g., seen concealing items)."
            }
        ]
    },
    {
        id: 3,
        category: 'ENTRY',
        title: "Life or Limb: s.17 Powers",
        description: "Emergency entry powers. Can you enter to protect property?",
        type: 'CURRICULUM',
        scenario: "You arrive at a house where neighbors report a leak flooding their flat from above. The resident isn't answering. Do you have power to enter under s.17 PACE to stop the leak?",
        extract: {
            act: "PACE 1984",
            section: "Section 17",
            wording: "A constable may enter and search... for the purpose of saving life or limb or preventing serious damage to property.",
            interpretation: "Note the word 'SERIOUS'. A standard leak might not qualify unless it threatens structural integrity or life."
        },
        options: [
            {
                label: "Enter under s.17 to prevent damage",
                act: "PACE 1984",
                section: "17",
                isCorrect: false,
                rationale: "Incorrect. While s.17 allows for 'serious damage to property', common law or other acts are usually preferred for minor leaks. The threshold for s.17 (saving life/limb) is very high."
            },
            {
                label: "Enter to check welfare (Life or Limb)",
                act: "PACE 1984",
                section: "17(1)(e)",
                isCorrect: true,
                rationale: "Correct. If you have any reason to suspect the resident inside is unwell/injured (causing the leak), s.17(1)(e) is your primary power."
            }
        ]
    },
    {
        id: 4,
        category: 'FORCE',
        title: "Self Defense vs s.117",
        description: "Understanding the different headers for use of force.",
        type: 'CURRICULUM',
        scenario: "A suspect you are arresting takes a swing at you. You push them away and use PAVA. Which power are you using?",
        extract: {
            act: "Criminal Law Act / Common Law",
            section: "s.3(1) CLA / s.117 PACE",
            wording: "A person may use such force as is reasonable in the circumstances in the prevention of crime.",
            interpretation: "Met officers must justify force under: Common Law (Self-Defense), s.3 Criminal Law Act (Prevention of Crime), or s.117 PACE (Exercise of a power)."
        },
        options: [
            {
                label: "Common Law (Self Defense)",
                act: "Common Law",
                isCorrect: true,
                rationale: "Correct. Since you are protecting yourself from a physical strike, Common Law (Self Defense) is the most direct justification."
            },
            {
                label: "s.1 PACE (Search Power)",
                isCorrect: false,
                rationale: "Incorrect. s.1 is the search power itself, not the justification for the force used during it. That would be s.117."
            }
        ]
    },
    {
        id: 103,
        category: 'TACTICAL',
        title: "Op Hearth: Domestic Response",
        description: "Respond to a high-risk domestic disturbance call requiring rapid THRIVE assessment.",
        type: 'DYNAMIC',
        initialStageId: 'arrival',
        stages: {
            'arrival': {
                id: 'arrival',
                description: "You arrive at a residential address. Neighbors reported 'screaming and smashing glass'. The front door is slightly ajar. You hear a female voice crying from the living room.",
                options: [
                    { label: "Announce 'Police' and enter (s.17)", nextStageId: 'entry', controlResponse: "Control: 'Acknowledged. Bodyworn active. Backup unit ETA 2 mins.'" },
                    { label: "Wait for backup at the doorway", nextStageId: 'entry', rationale: "High risk of immediate harm. Delaying entry when the door is ajar and shouting is audible may fail the Duty of Care." }
                ]
            },
            'entry': {
                id: 'entry',
                description: "You find a female on the floor with visible bruising. A male is standing over her, holding a broken bottle. He is agitated and shouting at you to leave.",
                actor: { name: "Male Subject", role: "Aggressor", dialogue: "This is none of your business! Get out of my house!" },
                options: [
                    { label: "Use Tactical Communication & PAVA primary", nextStageId: 'resolution', thriveNote: "THRIVE: High risk of serious injury. The subject has a lethal weapon (glass)." },
                    { label: "Attempt physical restraint immediately", nextStageId: 'resolution', rationale: "Unsafe. Entering the 'Reaction Gap' while he holds a broken bottle increases risk of injury to you and the victim." }
                ]
            },
            'resolution': {
                id: 'resolution',
                description: "The subject drops the bottle and is secured. The female victim needs immediate safeguarding and evidence needs to be preserved as 'res gestae'.",
                options: [
                    { label: "Arrest for s.39 Assault & Secure Scene", isCorrect: true, rationale: "Correct. Immediate arrest to prevent further injury and secure evidence (Necessity: 'Protection of a vulnerable person').", act: "PACE 1984", section: "24" },
                    { label: "Take victim's statement and leave suspect", isCorrect: false, rationale: "Failure. High risk of repeat victimization. Suspect must be arrested to ensure safeguarding (THRIVE)." }
                ]
            }
        }
    },
    {
        id: 6,
        category: 'ARREST',
        title: "Statutory Necessity",
        description: "Understanding the necessity criteria for arrest under s.24 PACE.",
        type: 'CURRICULUM',
        scenario: "You have grounds to arrest a male for shoplifting. He is cooperative and provides a verified home address. Do you have necessity to arrest?",
        extract: {
            act: "PACE 1984",
            section: "24(5)",
            wording: "The necessity criteria: (a) name/address unknown, (c) prevent injury/damage, (e) allow prompt and effective investigation...",
            interpretation: "If name/address is verified and there is no risk of further loss/damage, necessity is low. You cannot arrest just 'because a crime was committed'."
        },
        options: [
            {
                label: "Arrest to facilitate interview",
                act: "PACE 1984",
                section: "24",
                isCorrect: false,
                rationale: "Incorrect. If he is cooperative and address is verified, a voluntary interview (VA) is the more proportionate response."
            },
            {
                label: "Report for Summons / Voluntary Interview",
                act: "HRA 1998",
                section: "Art. 5",
                isCorrect: true,
                rationale: "Correct. Arrest must be the LAST resort. If the investigation can be handled effectively via VA, the arrest is not 'necessary' or 'proportionate'."
            }
        ]
    },
    {
        id: 7,
        category: 'SEARCH',
        title: "Misuse of Drugs: s.23",
        description: "Searching for controlled substances vs prohibited items.",
        type: 'CURRICULUM',
        scenario: "You detect a strong smell of cannabis emanating from a vehicle. Under which power do you perform the search?",
        extract: {
            act: "Misuse of Drugs Act 1971",
            section: "23",
            wording: "A constable may search a person/vehicle if they have reasonable grounds to suspect they are in possession of a controlled drug.",
            interpretation: "Unlike s.1 PACE, s.23 MODA allows for the search of drugs specifically. The 'smell of cannabis' alone is a contentious but valid ground in many tactical contexts."
        },
        options: [
            {
                label: "Search under s.23 MODA",
                act: "MODA 1971",
                section: "23",
                isCorrect: true,
                rationale: "Correct. Section 23 is the specialist power for searching for controlled drugs."
            },
            {
                label: "Search under s.1 PACE",
                isCorrect: false,
                rationale: "Incorrect. s.1 PACE is for stolen goods, offensive weapons, and 'prohibited articles' (e.g. blades, fireworks). Drugs fall under the MODA."
            }
        ]
    },
    {
        id: 8,
        category: 'DETENTION',
        title: "The Custody Clock",
        description: "Managing detention limits and reviews.",
        type: 'CURRICULUM',
        scenario: "A suspect is arrested at 10:00. They arrive at the station at 11:30. When does the 24-hour 'clock' officially start?",
        extract: {
            act: "PACE 1984",
            section: "Part IV",
            wording: "Detention shall be calculated from the relevant time... either the time of arrival at the first police station or 24 hours after arrest (whichever is earlier).",
            interpretation: "The 'PACE Clock' starts the moment they cross the threshold of the custody suite."
        },
        options: [
            {
                label: "At time of arrest (10:00)",
                isCorrect: false,
                rationale: "Incorrect. The clock only starts at the station to allow for transport time, unless there is a significant delay."
            },
            {
                label: "Upon arrival at the station (11:30)",
                act: "PACE 1984",
                section: "41",
                isCorrect: true,
                rationale: "Correct. 11:30 marks the 'Relevant Time' for the start of the detention period."
            }
        ]
    },
    {
        id: 5,
        category: 'TRAFFIC',
        title: "The s.163 Stop",
        description: "Uniformed stops vs s.1 PACE stops.",
        type: 'CURRICULUM',
        scenario: "You are in uniform and want to check the driver's license of a moving vehicle. You have no suspicion of crime. Can you stop them?",
        extract: {
            act: "Road Traffic Act 1988",
            section: "163",
            wording: "A person driving a motor vehicle on a road must stop the vehicle on being required to do so by a constable in uniform.",
            interpretation: "This is a blanket power. You do NOT need reasonable suspicion to stop a car to check documents in uniform. However, search requires a separate power."
        },
        options: [
            {
                label: "Yes, under s.163 RTA",
                act: "RTA 1988",
                section: "163",
                isCorrect: true,
                rationale: "Correct. Uniform gives you the power to stop any vehicle for document checks without suspicion."
            },
            {
                label: "No, need s.1 PACE suspicion first",
                isCorrect: false,
                rationale: "Incorrect. s.1 PACE is for SEARCH, not for the initial STOP under traffic law."
            }
        ]
    },
    {
        id: 104,
        category: 'TACTICAL',
        title: "Op Venice: Pursuit Phase",
        description: "Tactical management of a moped pursuit with multiple suspects.",
        type: 'DYNAMIC',
        initialStageId: 'init_pursuit',
        stages: {
            'init_pursuit': {
                id: 'init_pursuit',
                description: "You're in a marked TST unit. A moped with two riders, both wearing black visors, fails to stop and begins to mount the pavement. Pedestrians are present.",
                options: [
                    { label: "Maintain pursuit with Blues & Twoes", nextStageId: 'risk_assessment', controlResponse: "Control: 'Driver authorization for TPAC? Awaiting Supervisor...'" },
                    { label: "Terminate pursuit immediately", nextStageId: 'risk_assessment', rationale: "High risk to pedestrians. Termination may be necessary if the risk of pursuit outweighs the risk of the suspects being at large." }
                ]
            },
            'risk_assessment': {
                id: 'risk_assessment',
                description: "The moped enters a pedestrianized shopping street. The pillion rider is looking back and making erratic gestures. A mother with a pram is 50 meters ahead.",
                options: [
                    { label: "STAND DOWN / Terminate", nextStageId: 'debrief_pursuit', thriveNote: "THRIVE: Risk to life of innocent pedestrians is too high for the offense (Traffic/Theft)." },
                    { label: "Continue on pavement safely", nextStageId: 'debrief_pursuit', rationale: "Tactically unsound. A police vehicle on a pedestrianized pavement at speed is a significant risk to life (IPCC/IOPC liability)." }
                ]
            },
            'debrief_pursuit': {
                id: 'debrief_pursuit',
                description: "The pursuit is terminated. Suspects escape but you have fixed CCTV coverage and a known direction of travel.",
                options: [
                    { label: "Transmit descriptions and coordinate area search", isCorrect: true, rationale: "Correct. Safe termination followed by intelligence coordination is the professional standard for high-risk low-reward pursuits.", act: "APP Pursuit", section: "Tactics" },
                    { label: "Search for the moped alone", isCorrect: false, rationale: "Failure. You must communicate with Control to ensure sector-wide coverage and maximize capture probability without high-speed risk." }
                ]
            }
        }
    }
];

export default function PolicePowers({ username, onExit }: PolicePowersProps) {
    const [view, setView] = useState<'intro' | 'hub' | 'scenario' | 'analysis' | 'dynamic' | 'feedback'>('intro');
    const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
    const [currentStageId, setCurrentStageId] = useState<string | null>(null);
    const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [masteredLegislation, setMasteredLegislation] = useState<Set<string>>(new Set());
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<PowerCategory | 'ALL'>('ALL');
    const [controlLog, setControlLog] = useState<string[]>([]);

    useEffect(() => {
        const savedMastery = localStorage.getItem(`met_mast_v4_${username}`);
        const savedCompleted = localStorage.getItem(`met_comp_v4_${username}`);
        if (savedMastery) setMasteredLegislation(new Set(JSON.parse(savedMastery)));
        if (savedCompleted) setCompletedIds(new Set(JSON.parse(savedCompleted)));
    }, [username]);

    useEffect(() => {
        localStorage.setItem(`met_mast_v4_${username}`, JSON.stringify(Array.from(masteredLegislation)));
        localStorage.setItem(`met_comp_v4_${username}`, JSON.stringify(Array.from(completedIds)));
    }, [masteredLegislation, completedIds, username]);

    const handleChoice = (idx: number) => {
        if (!currentScenario) return;
        const currentStage = currentScenario.type === 'DYNAMIC' && currentStageId
            ? currentScenario.stages?.[currentStageId]
            : null;

        const options = currentScenario.type === 'DYNAMIC' && currentStage
            ? currentStage.options
            : currentScenario.options || [];

        const choice = options[idx];
        setSelectedOpt(idx);

        if (choice.controlResponse) setControlLog(prev => [...prev, choice.controlResponse!]);

        if (choice.nextStageId) {
            setTimeout(() => {
                setCurrentStageId(choice.nextStageId!);
                setSelectedOpt(null);
            }, 600);
            return;
        }

        if (choice.isCorrect !== undefined) {
            if (choice.isCorrect) {
                setScore(s => s + 1000);
                if (choice.act && choice.section) setMasteredLegislation(prev => new Set([...Array.from(prev), `${choice.act} s.${choice.section}`]));
                setCompletedIds(prev => new Set([...Array.from(prev), currentScenario.id]));
            } else {
                setScore(s => Math.max(0, s - 500));
            }
            setTimeout(() => setView('feedback'), 400);
        }
    };

    const startScenario = (scenario: Scenario) => {
        // SAFETY: Reset all stage-related state before entering a new scenario
        setCurrentScenario(scenario);
        setSelectedOpt(null);
        setControlLog([]);

        if (scenario.type === 'DYNAMIC') {
            const initialId = scenario.initialStageId || (scenario.stages ? Object.keys(scenario.stages)[0] : null);
            setCurrentStageId(initialId);
            setView('dynamic');
        } else {
            setCurrentStageId(null);
            setView('analysis');
        }
    };

    const categories: { type: PowerCategory; label: string; icon: any }[] = [
        { type: 'TACTICAL', label: 'Tactical (NDM)', icon: Crosshair },
        { type: 'SEARCH', label: 'Stop & Search', icon: Search },
        { type: 'FORCE', label: 'Use of Force', icon: Zap },
        { type: 'ARREST', label: 'Arrest Law', icon: UserCheck },
        { type: 'ENTRY', label: 'Entry Powers', icon: Unlock },
        { type: 'PUBLIC_ORDER', label: 'Public Order', icon: Users },
        { type: 'DETENTION', label: 'Detention', icon: Lock },
        { type: 'TRAFFIC', label: 'Road Traffic', icon: Siren }
    ];

    const getRank = () => {
        const count = masteredLegislation.size;
        if (count >= 15) return "Commander";
        if (count >= 12) return "Chief Superintendent";
        if (count >= 10) return "Superintendent";
        if (count >= 8) return "Chief Inspector";
        if (count >= 6) return "Inspector";
        if (count >= 4) return "Sergeant";
        return "Probationer";
    };

    // Derived state for dynamic views to prevent runtime errors
    const currentStage = (currentScenario?.type === 'DYNAMIC' && currentStageId && currentScenario.stages)
        ? currentScenario.stages[currentStageId]
        : null;

    return (
        <div className="fixed inset-0 z-[100] bg-[#020617] overflow-hidden select-none font-sans text-slate-200">
            {/* GRID & GLOW BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-blue-900/10" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-900/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </div>

            {/* SILLITOE TARTAN BAR */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 z-50 flex shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} className={cn("flex-1 h-full", i % 2 === 0 ? "bg-white" : "bg-blue-950")} />
                ))}
            </div>

            {/* SCANLINE OVERLAY */}
            <div className="absolute inset-0 pointer-events-none z-[200] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

            {/* TOP BAR / HUD */}
            <header className="absolute top-0 inset-x-0 h-20 px-6 md:px-12 flex items-center justify-between z-[110] border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative h-10 w-10 md:h-12 md:w-12 bg-slate-900 border border-white/10 flex items-center justify-center rounded-lg shadow-2xl">
                            <Shield className="text-blue-500 w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            MET <span className="text-blue-500 font-black">ACADEMY</span>
                            <span className="hidden md:block text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-mono tracking-tighter">SECURE-v4.1</span>
                        </h1>
                        <p className="text-[9px] uppercase tracking-[0.3em] font-semibold text-slate-500 leading-none mt-0.5 whitespace-nowrap">Training Command // London</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-8">
                    <div className="hidden lg:flex items-center gap-6 px-6 py-2 border-x border-white/5">
                        <div className="text-right">
                            <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Officer</p>
                            <p className="text-xs font-black text-white">{username}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Designation</p>
                            <p className="text-xs font-black text-blue-400 italic underline underline-offset-4 decoration-blue-500/30">{getRank()}</p>
                        </div>
                    </div>

                    <button onClick={onExit} className="h-10 w-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all rounded-lg border border-red-500/20 group">
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </header>

            {/* MAIN PORTAL */}
            <main className="relative inset-0 flex items-center justify-center pt-24 pb-20 px-6">
                <AnimatePresence mode="wait">
                    {view === 'intro' && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-4xl w-full"
                        >
                            <div className="relative group p-1">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-16 shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                                        <Landmark className="w-64 h-64" />
                                    </div>

                                    <div className="mb-12">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-6 w-1 bg-blue-500 rounded-full" />
                                            <span className="text-xs uppercase tracking-[0.5em] text-blue-400 font-black">Authorized Personnel Only</span>
                                        </div>
                                        <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] uppercase italic mb-8">
                                            SERVICE <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">EXCELLENCE</span>
                                        </h2>
                                        <div className="max-w-xl text-slate-400 font-medium text-base md:text-lg leading-relaxed">
                                            Welcome to the Metropolitan Police Service's security-cleared training portal.
                                            Master the <span className="text-white font-bold">National Decision Model</span> through high-fidelity, evolving operational encounters.
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => setView('hub')}
                                            className="group relative px-10 py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                                        >
                                            Initialize Protocol
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <div className="px-10 py-5 bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest rounded-xl border border-white/5 flex items-center justify-center gap-3">
                                            <Database className="w-4 h-4" />
                                            SECURE-LINK ACTIVE
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'hub' && (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full max-w-7xl h-full flex flex-col gap-6"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-white/5 pb-4">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                                        <Terminal className="text-blue-500 w-6 h-6" />
                                        Academy <span className="text-blue-500 font-black">Curriculum</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Select an operational training stream</p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-900/50 rounded-lg p-3 border border-white/5 shadow-inner">
                                    <div className="w-32 md:w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(completedIds.size / ALL_SCENARIOS.length) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-black uppercase leading-none">Service Mastery</span>
                                        <span className="text-sm font-black text-blue-400 font-mono">{Math.round((completedIds.size / ALL_SCENARIOS.length) * 100)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6 h-full min-h-0">
                                <div className="col-span-12 lg:col-span-3 lg:pr-6 lg:border-r lg:border-white/5 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.type}
                                            onClick={() => setSelectedCategory(cat.type)}
                                            className={cn(
                                                "flex-shrink-0 lg:w-full p-4 flex items-center justify-between transition-all rounded-xl border border-white/5 group",
                                                selectedCategory === cat.type
                                                    ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.2)] scale-105 z-10"
                                                    : "bg-slate-900/50 text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <cat.icon className={cn("w-5 h-5 transition-colors", selectedCategory === cat.type ? "text-white" : "text-blue-500 group-hover:text-blue-400")} />
                                                <span className="text-[11px] font-black uppercase tracking-wider">{cat.label}</span>
                                            </div>
                                            <ChevronRight className={cn("w-4 h-4 opacity-40 shrink-0 transition-transform group-hover:translate-x-1", selectedCategory === cat.type ? "block" : "hidden lg:block")} />
                                        </button>
                                    ))}
                                </div>

                                <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pr-2 custom-scrollbar content-start pb-10">
                                    {ALL_SCENARIOS.filter(s => selectedCategory === 'ALL' || s.category === selectedCategory).map(scenario => {
                                        const isCompleted = completedIds.has(scenario.id);
                                        return (
                                            <motion.div
                                                key={scenario.id}
                                                whileHover={{ y: -4, scale: 1.01 }}
                                                onClick={() => startScenario(scenario)}
                                                className={cn(
                                                    "group relative flex flex-col p-6 rounded-2xl border transition-all cursor-pointer shadow-xl",
                                                    isCompleted
                                                        ? "bg-emerald-950/20 border-emerald-500/30 opacity-70"
                                                        : "bg-slate-900/50 border-white/5 hover:border-blue-500/50 hover:bg-slate-800/80"
                                                )}
                                            >
                                                {scenario.type === 'DYNAMIC' && (
                                                    <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                                        <Activity className="w-2.5 h-2.5" />
                                                        Evolving Scenario
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-xl flex items-center justify-center border shadow-inner transition-colors",
                                                        isCompleted
                                                            ? "bg-emerald-500 border-emerald-400 text-white"
                                                            : "bg-slate-900 border-white/5 text-blue-500 group-hover:bg-blue-600 group-hover:text-white"
                                                    )}>
                                                        {scenario.type === 'DYNAMIC' ? <Crosshair className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{scenario.category}</p>
                                                        <h4 className="text-lg font-black text-white group-hover:text-blue-100 transition-colors uppercase tracking-tight leading-none">{scenario.title}</h4>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-400 font-medium leading-relaxed italic mb-6 border-l-2 border-white/5 pl-4 line-clamp-2">
                                                    "{scenario.description}"
                                                </p>

                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-500 group-hover:text-blue-400">
                                                        <Siren className="w-3.5 h-3.5" /> Initialize Unit
                                                    </div>
                                                    {isCompleted && (
                                                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-black uppercase tracking-wider">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Certified
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'analysis' && currentScenario && (
                        <motion.div
                            key="analysis"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-4xl w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <Scale className="text-blue-500 w-6 h-6" />
                                <h3 className="text-sm uppercase tracking-[0.4em] text-blue-400 font-black">Pre-Operational Analysis</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight italic">
                                        {currentScenario.title}
                                    </h4>
                                    <div className="p-6 bg-slate-950/50 rounded-xl border-l-4 border-blue-600 shadow-inner">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Target Statute</p>
                                        <p className="text-lg font-bold text-white mb-2 underline underline-offset-4 decoration-blue-500/30">
                                            {currentScenario.extract?.act}
                                        </p>
                                        <p className="text-xl font-black italic text-slate-200">
                                            "{currentScenario.extract?.wording}"
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6 flex flex-col">
                                    <div className="p-6 bg-blue-600/5 rounded-xl border border-blue-500/20">
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Info className="w-3 h-3" /> Service Guidance
                                        </p>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">
                                            {currentScenario.extract?.interpretation}
                                        </p>
                                    </div>
                                    <div className="mt-auto space-y-4">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                            <Siren className="w-3 h-3" /> Operational Summary
                                        </p>
                                        <p className="text-lg font-bold text-white italic">"{currentScenario.scenario}"</p>
                                        <button
                                            onClick={() => setView('scenario')}
                                            className="w-full py-5 bg-white text-[#020617] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3 group"
                                        >
                                            Begin Ops
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'dynamic' && currentScenario && currentStageId && currentStage && (
                        <motion.div
                            key="dynamic"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full max-w-7xl h-full flex flex-col gap-6"
                        >
                            <div className="flex items-center gap-3">
                                <Activity className="text-blue-500 w-5 h-5 animate-pulse" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-400">Tactical Dynamic Simulation // In Progress</h3>
                            </div>

                            <div className="grid grid-cols-12 gap-6 h-full min-h-0">
                                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                                    <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-8 md:p-12 shadow-2xl flex-1 overflow-hidden min-h-[300px]">
                                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                                            <Crosshair className="w-48 h-48" />
                                        </div>

                                        <div className="mb-10">
                                            <p className="text-2xl md:text-4xl font-black text-white italic leading-tight uppercase tracking-tighter">
                                                "{currentStage.description}"
                                            </p>
                                        </div>

                                        {currentStage.actor && (
                                            <motion.div
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="bg-slate-950/50 p-6 rounded-xl border border-white/10 flex items-center gap-6 shadow-inner mb-6"
                                            >
                                                <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 overflow-hidden relative group">
                                                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <UserCircle2 className="w-10 h-10 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">{currentStage.actor.role}: {currentStage.actor.name}</p>
                                                    <p className="text-lg font-black text-white italic">"{currentStage.actor.dialogue}"</p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {currentStage.intel && (
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg flex gap-4"
                                            >
                                                <Radio className="text-blue-500 shrink-0 w-5 h-5" />
                                                <div>
                                                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Signals Intel // Unencrypted</p>
                                                    <p className="text-xs text-slate-300 font-bold leading-relaxed">{currentStage.intel}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="h-48 bg-slate-950/50 rounded-2xl border border-white/5 p-6 shadow-inner overflow-hidden flex flex-col">
                                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Control Comms // Feed</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                            {controlLog.length === 0 ? (
                                                <p className="text-[10px] text-slate-600 font-mono italic">Waiting for transmission...</p>
                                            ) : (
                                                controlLog.map((log, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="flex gap-3 items-start"
                                                    >
                                                        <span className="text-[8px] font-mono text-blue-500 mt-0.5">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                                                        <p className="text-[11px] text-slate-300 font-mono leading-tight">{log}</p>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-full border-t-blue-600 border-t-4">
                                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                                            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                                                <BrainCircuit className="text-white w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none">NDM Loop</h4>
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Tactical Analysis</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-10 min-h-0 overflow-y-auto pr-2">
                                            {[
                                                { label: 'Information', active: true },
                                                { label: 'Assessment (THRIVE)', active: false },
                                                { label: 'Powers & Policy', active: false },
                                                { label: 'Tactical Options', active: false },
                                                { label: 'Action & Review', active: false },
                                            ].map((step, i) => (
                                                <div key={i} className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black border transition-all",
                                                            step.active
                                                                ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)] animate-pulse"
                                                                : "bg-slate-800 border-white/5 text-slate-500"
                                                        )}>
                                                            {i + 1}
                                                        </div>
                                                        <p className={cn("text-[10px] font-black uppercase tracking-wider", step.active ? "text-white" : "text-slate-600")}>
                                                            {step.label}
                                                        </p>
                                                    </div>
                                                    {i < 4 && <div className="w-0.5 h-3 bg-white/5 ml-3" />}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-auto space-y-3">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Tactical Maneuver</p>
                                            {currentStage.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleChoice(i)}
                                                    className="w-full p-4 text-left bg-slate-800/50 hover:bg-white hover:text-[#020617] border border-white/5 rounded-xl transition-all group flex justify-between items-center transition-all duration-300"
                                                >
                                                    <span className="text-xs font-black uppercase tracking-wider leading-tight">{opt.label}</span>
                                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'scenario' && currentScenario && (
                        <motion.div
                            key="scenario"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-5xl space-y-10"
                        >
                            <div className="text-center space-y-4">
                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.8em]">Operational Decision Hub</p>
                                <h3 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">{currentScenario.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto pb-10">
                                {currentScenario.options?.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleChoice(i)}
                                        className="group relative p-8 md:p-10 bg-slate-900 border border-white/10 hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all text-left shadow-2xl"
                                    >
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 transition-all duration-500 scale-y-0 group-hover:scale-y-100" />
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="space-y-2">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest group-hover:text-blue-500 transition-colors">Tactical Action // 0{i + 1}</p>
                                                <h4 className="text-xl md:text-3xl font-black text-white group-hover:italic transition-all uppercase tracking-tight leading-none">{opt.label}</h4>
                                            </div>
                                            <div className="h-12 w-12 md:h-16 md:w-16 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                                <ChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {view === 'feedback' && currentScenario && selectedOpt !== null && (
                        <motion.div
                            key="feedback"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl w-full"
                        >
                            {(() => {
                                const opt = currentScenario.type === 'DYNAMIC' && currentStageId && currentScenario.stages
                                    ? currentScenario.stages[currentStageId]?.options[selectedOpt]
                                    : currentScenario.options?.[selectedOpt];
                                const isCorrect = opt?.isCorrect;

                                return (
                                    <div className={cn(
                                        "relative p-1 rounded-3xl overflow-hidden shadow-2xl",
                                        isCorrect ? "bg-emerald-500" : "bg-red-500"
                                    )}>
                                        <div className="bg-slate-900/90 backdrop-blur-3xl rounded-[22px] p-10 md:p-16 text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                                                <Award className="w-64 h-64" />
                                            </div>

                                            <div className="mb-10 inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-950/50 border border-white/5">
                                                {isCorrect ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <AlertTriangle className="text-red-500 w-5 h-5" />}
                                                <span className={cn("text-xs font-black uppercase tracking-[0.3em]", isCorrect ? "text-emerald-400" : "text-red-400")}>
                                                    {isCorrect ? "Service Alignment Confirmed" : "Service Standards Violation"}
                                                </span>
                                            </div>

                                            <h4 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-[0.9] mb-10">
                                                {isCorrect ? "OPERATIONAL" : "TACTICAL"} <br />
                                                <span className={isCorrect ? "text-emerald-500" : "text-red-500"}>{isCorrect ? "MASTERY" : "FAILURE"}</span>
                                            </h4>

                                            <div className="py-10 border-y border-white/10 mb-12 bg-slate-950/40 rounded-xl px-10 shadow-inner">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.6em] mb-8 italic">National Decision Model // Final Review</p>
                                                <p className="text-xl md:text-3xl font-bold text-slate-200 leading-tight italic uppercase tracking-tight mb-10 mx-auto max-w-2xl">
                                                    "{opt?.rationale}"
                                                </p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-8">
                                                    {opt?.ndmNote && (
                                                        <div className="bg-blue-600/10 p-4 border-l-2 border-blue-600 rounded-r-lg">
                                                            <p className="text-[8px] text-blue-500 font-black uppercase tracking-widest mb-1">NDM Principle</p>
                                                            <p className="text-[11px] text-slate-300 font-medium leading-tight">{opt.ndmNote}</p>
                                                        </div>
                                                    )}
                                                    {opt?.thriveNote && (
                                                        <div className="bg-indigo-600/10 p-4 border-l-2 border-indigo-600 rounded-r-lg">
                                                            <p className="text-[8px] text-indigo-500 font-black uppercase tracking-widest mb-1">THRIVE Focus</p>
                                                            <p className="text-[11px] text-slate-300 font-medium leading-tight">{opt.thriveNote}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-4 justify-center">
                                                    <div className="px-6 py-2 bg-white text-[#020617] font-black text-xs md:text-sm uppercase rounded shadow-lg">{opt?.act || "General Protocol"}</div>
                                                    {opt?.section && <div className="px-6 py-2 bg-white text-[#020617] font-black text-xs md:text-sm uppercase rounded shadow-lg">s.{opt.section}</div>}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setView('hub')}
                                                className="px-16 py-5 bg-white text-[#020617] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 mx-auto group"
                                            >
                                                Return to Ops Center
                                                <History className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
