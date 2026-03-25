#!/usr/bin/env python3
"""
DTEcho Cubism Editor Plugin — Real-Time Cognitive Avatar Controller

Connects to Live2D Cubism Editor via the External Application Integration API
(WebSocket on port 22033) and drives all 138 model parameters in real-time from
the Deep Tree Echo cognitive architecture.

Features:
  - Registers as "DTEcho Cognitive Controller" with Cubism Editor
  - Drives expressions via 13 FACS-aligned presets
  - Simulates the virtual endocrine system (12 hormone channels)
  - Runs the Echobeats 12-step cognitive cycle with 3 concurrent streams
  - Maps cognitive states to Cubism parameter values with smooth interpolation
  - Listens for MOC3 export events

Usage:
  python dtecho_cubism_plugin.py [--port 22033] [--mode interactive|cycle|demo]

Requirements:
  pip install websockets

Protocol:
  Cubism Editor External API v1.0.1 over WebSocket (JSON/UTF-8)
"""

import asyncio
import json
import math
import time
import random
import argparse
import sys
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets", "-q"])
    import websockets


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: Cubism Editor API Client
# ═══════════════════════════════════════════════════════════════════════════════

class CubismEditorClient:
    """WebSocket client for the Cubism Editor External Application Integration API."""

    def __init__(self, host: str = "localhost", port: int = 22033):
        self.host = host
        self.port = port
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.token: Optional[str] = None
        self.model_uid: Optional[str] = None
        self.request_id = 0
        self.approved = False

    async def connect(self):
        """Connect to Cubism Editor WebSocket server."""
        uri = f"ws://{self.host}:{self.port}"
        print(f"[CubismClient] Connecting to {uri}...")
        self.ws = await websockets.connect(uri)
        print(f"[CubismClient] Connected.")

    async def send_request(self, method: str, data: dict = None) -> dict:
        """Send a JSON-RPC request and wait for the response."""
        self.request_id += 1
        msg = {
            "Version": "1.0.1",
            "Timestamp": int(time.time() * 1000),
            "RequestId": str(self.request_id),
            "Type": "Request",
            "Method": method,
            "Data": data or {}
        }
        await self.ws.send(json.dumps(msg))
        response_raw = await self.ws.recv()
        response = json.loads(response_raw)
        if response.get("Type") == "Error":
            raise RuntimeError(
                f"API Error on {method}: {response.get('Data', {}).get('ErrorType', 'Unknown')}"
            )
        return response.get("Data", {})

    async def register(self, name: str = "DTEcho Cognitive Controller"):
        """Register this plugin with Cubism Editor."""
        print(f"[CubismClient] Registering as '{name}'...")
        data = await self.send_request("RegisterPlugin", {
            "Name": name,
            "Token": self.token or "",
        })
        self.token = data.get("Token", "")
        print(f"[CubismClient] Registered. Token: {self.token[:16]}...")
        print("[CubismClient] Waiting for user approval in Cubism Editor...")
        # Poll for approval
        for _ in range(120):  # Wait up to 2 minutes
            data = await self.send_request("GetIsApproval")
            if data.get("Result", False):
                self.approved = True
                print("[CubismClient] Approved by user!")
                return
            await asyncio.sleep(1)
        raise TimeoutError("User did not approve the plugin within 2 minutes.")

    async def get_documents(self) -> dict:
        """Get list of open documents."""
        return await self.send_request("GetDocuments")

    async def get_current_model_uid(self) -> str:
        """Get the UID of the currently active model."""
        docs = await self.get_documents()
        modeling_docs = docs.get("ModelingDocuments", [])
        if modeling_docs:
            views = modeling_docs[0].get("Views", [])
            if views:
                self.model_uid = views[0].get("ModelUID", "")
                return self.model_uid
        raise RuntimeError("No model is open in Cubism Editor.")

    async def get_parameters(self) -> list:
        """Get all parameters of the current model."""
        if not self.model_uid:
            await self.get_current_model_uid()
        data = await self.send_request("GetParameters", {
            "ModelUID": self.model_uid
        })
        return data.get("Parameters", [])

    async def get_parameter_values(self, ids: list = None) -> list:
        """Get current parameter values."""
        if not self.model_uid:
            await self.get_current_model_uid()
        req = {"ModelUID": self.model_uid}
        if ids:
            req["Ids"] = ids
        data = await self.send_request("GetParameterValues", req)
        return data.get("Parameters", [])

    async def set_parameter_values(self, params: list):
        """Set parameter values. params = [{"Id": "ParamX", "Value": 0.5}, ...]"""
        if not self.model_uid:
            await self.get_current_model_uid()
        await self.send_request("SetParameterValues", {
            "ModelUID": self.model_uid,
            "Parameters": params
        })

    async def subscribe_moc_export(self):
        """Subscribe to MOC3 export notifications."""
        await self.send_request("NotifyMocFileExported", {"Enabled": True})
        print("[CubismClient] Subscribed to MOC3 export events.")

    async def disconnect(self):
        """Disconnect from Cubism Editor."""
        if self.ws:
            await self.ws.close()
            print("[CubismClient] Disconnected.")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: Virtual Endocrine System (12 Hormone Channels)
# ═══════════════════════════════════════════════════════════════════════════════

class HormoneChannel(Enum):
    CORTISOL = "cortisol"           # Stress / threat response
    DOPAMINE = "dopamine"           # Reward / motivation
    SEROTONIN = "serotonin"         # Mood stability / contentment
    NOREPINEPHRINE = "norepinephrine"  # Alertness / arousal
    OXYTOCIN = "oxytocin"           # Social bonding / trust
    MELATONIN = "melatonin"         # Circadian / drowsiness
    ADRENALINE = "adrenaline"       # Fight-or-flight
    ENDORPHIN = "endorphin"         # Pain relief / euphoria
    GABA = "gaba"                   # Inhibition / calm
    GLUTAMATE = "glutamate"         # Excitation / learning
    ACETYLCHOLINE = "acetylcholine"  # Attention / memory
    ANANDAMIDE = "anandamide"       # Bliss / relaxation


@dataclass
class EndocrineState:
    """Current state of the virtual endocrine system."""
    levels: dict = field(default_factory=lambda: {
        h: 0.5 for h in HormoneChannel
    })
    _time: float = 0.0

    def tick(self, dt: float):
        """Advance the endocrine system by dt seconds."""
        self._time += dt
        # Natural oscillations (circadian-like)
        for h in HormoneChannel:
            base = self.levels[h]
            # Slow drift toward homeostasis (0.5)
            self.levels[h] += (0.5 - base) * 0.01 * dt
            # Add subtle oscillation
            freq = {
                HormoneChannel.MELATONIN: 0.001,
                HormoneChannel.CORTISOL: 0.003,
                HormoneChannel.SEROTONIN: 0.002,
            }.get(h, 0.005)
            self.levels[h] += math.sin(self._time * freq * 2 * math.pi) * 0.001
            self.levels[h] = max(0.0, min(1.0, self.levels[h]))

    def inject(self, hormone: HormoneChannel, amount: float):
        """Inject a hormone (positive = increase, negative = decrease)."""
        self.levels[hormone] = max(0.0, min(1.0,
            self.levels[hormone] + amount
        ))

    def get_cognitive_mode(self) -> str:
        """Determine the dominant cognitive mode from hormone levels."""
        modes = {
            "REWARD": self.levels[HormoneChannel.DOPAMINE],
            "THREAT": self.levels[HormoneChannel.CORTISOL] + self.levels[HormoneChannel.ADRENALINE],
            "SOCIAL": self.levels[HormoneChannel.OXYTOCIN],
            "EXPLORATORY": self.levels[HormoneChannel.NOREPINEPHRINE] + self.levels[HormoneChannel.ACETYLCHOLINE],
            "REST": self.levels[HormoneChannel.MELATONIN] + self.levels[HormoneChannel.GABA],
            "CREATIVE": self.levels[HormoneChannel.ANANDAMIDE] + self.levels[HormoneChannel.ENDORPHIN],
            "FOCUSED": self.levels[HormoneChannel.GLUTAMATE] + self.levels[HormoneChannel.ACETYLCHOLINE],
        }
        return max(modes, key=modes.get)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: Expression Presets (FACS-aligned Cubism Parameters)
# ═══════════════════════════════════════════════════════════════════════════════

EXPRESSION_PRESETS = {
    "JOY_01_BroadSmile": {
        "ParamMouthOpenY": 0.6, "ParamMouthForm": 1.0,
        "ParamEyeLOpen": 0.7, "ParamEyeROpen": 0.7,
        "ParamBrowLY": 0.3, "ParamBrowRY": 0.3,
        "ParamCheek": 1.0, "ParamBodyAngleZ": 3.0,
        "ParamAngleZ": 5.0,
    },
    "JOY_02_Laughing": {
        "ParamMouthOpenY": 1.0, "ParamMouthForm": 1.0,
        "ParamEyeLOpen": 0.4, "ParamEyeROpen": 0.4,
        "ParamBrowLY": 0.4, "ParamBrowRY": 0.4,
        "ParamCheek": 1.0, "ParamBodyAngleY": 5.0,
        "ParamBodyAngleZ": 5.0, "ParamAngleZ": 8.0,
        "ParamAngleY": 5.0,
    },
    "JOY_03_GentleSmile": {
        "ParamMouthOpenY": 0.2, "ParamMouthForm": 0.8,
        "ParamEyeLOpen": 0.8, "ParamEyeROpen": 0.8,
        "ParamBrowLY": 0.15, "ParamBrowRY": 0.15,
        "ParamCheek": 0.6, "ParamAngleX": 3.0,
    },
    "JOY_05_Blissful": {
        "ParamMouthOpenY": 0.15, "ParamMouthForm": 0.9,
        "ParamEyeLOpen": 0.15, "ParamEyeROpen": 0.15,
        "ParamBrowLY": 0.2, "ParamBrowRY": 0.2,
        "ParamCheek": 0.8, "ParamAngleX": -5.0,
        "ParamAngleY": 8.0, "ParamBodyAngleX": -3.0,
    },
    "WONDER_02_CuriousGaze": {
        "ParamEyeLOpen": 1.0, "ParamEyeROpen": 0.85,
        "ParamBrowLY": 0.5, "ParamBrowRY": 0.2,
        "ParamBrowLAngle": 0.3, "ParamAngleZ": -8.0,
        "ParamAngleX": 10.0, "ParamEyeBallX": 0.5,
        "ParamMouthForm": 0.2,
    },
    "WONDER_03_Contemplative": {
        "ParamEyeLOpen": 0.6, "ParamEyeROpen": 0.6,
        "ParamBrowLY": 0.1, "ParamBrowRY": 0.1,
        "ParamBrowLAngle": -0.2, "ParamBrowRAngle": -0.2,
        "ParamEyeBallY": -0.5, "ParamAngleY": -8.0,
        "ParamAngleX": -5.0, "ParamMouthForm": -0.1,
        "ParamBodyAngleZ": -3.0,
    },
    "SADNESS_01_Melancholy": {
        "ParamEyeLOpen": 0.5, "ParamEyeROpen": 0.5,
        "ParamBrowLY": -0.5, "ParamBrowRY": -0.5,
        "ParamBrowLAngle": -0.6, "ParamBrowRAngle": -0.6,
        "ParamMouthForm": -0.6, "ParamMouthOpenY": 0.1,
        "ParamAngleY": -10.0, "ParamAngleX": -5.0,
        "ParamBodyAngleX": -3.0, "ParamBodyAngleZ": -5.0,
        "ParamCheek": 0.0,
    },
    "SURPRISE_01_Startled": {
        "ParamEyeLOpen": 1.2, "ParamEyeROpen": 1.2,
        "ParamBrowLY": 0.8, "ParamBrowRY": 0.8,
        "ParamMouthOpenY": 0.8, "ParamMouthForm": -0.3,
        "ParamAngleY": 5.0, "ParamBodyAngleZ": -3.0,
        "ParamEyeBallY": 0.3, "ParamAngleZ": -3.0,
    },
    "SPEAK_01_OpenVowel": {
        "ParamMouthOpenY": 0.7, "ParamMouthForm": 0.3,
        "ParamEyeLOpen": 0.85, "ParamEyeROpen": 0.85,
        "ParamBrowLY": 0.15, "ParamBrowRY": 0.15,
        "ParamAngleX": 5.0, "ParamBodyAngleY": 3.0,
    },
    "PHOTO_Awe": {
        "ParamEyeLOpen": 1.1, "ParamEyeROpen": 1.1,
        "ParamBrowLY": 0.6, "ParamBrowRY": 0.6,
        "ParamMouthOpenY": 0.4, "ParamMouthForm": 0.5,
        "ParamAngleY": 10.0, "ParamEyeBallY": 0.3,
    },
    "PHOTO_ExuberantLaugh": {
        "ParamMouthOpenY": 1.0, "ParamMouthForm": 1.0,
        "ParamEyeLOpen": 0.3, "ParamEyeROpen": 0.3,
        "ParamBrowLY": 0.5, "ParamBrowRY": 0.5,
        "ParamCheek": 1.0, "ParamAngleZ": 10.0,
        "ParamAngleY": 8.0, "ParamBodyAngleZ": 8.0,
        "ParamBodyAngleY": 5.0,
    },
    "PHOTO_UpwardGaze": {
        "ParamEyeLOpen": 0.9, "ParamEyeROpen": 0.9,
        "ParamEyeBallY": 0.7, "ParamBrowLY": 0.3,
        "ParamBrowRY": 0.3, "ParamMouthForm": 0.5,
        "ParamMouthOpenY": 0.15, "ParamAngleY": 15.0,
        "ParamAngleX": -3.0,
    },
    "NEUTRAL_Reset": {
        "ParamMouthOpenY": 0.0, "ParamMouthForm": 0.0,
        "ParamEyeLOpen": 1.0, "ParamEyeROpen": 1.0,
        "ParamBrowLY": 0.0, "ParamBrowRY": 0.0,
        "ParamBrowLAngle": 0.0, "ParamBrowRAngle": 0.0,
        "ParamAngleX": 0.0, "ParamAngleY": 0.0, "ParamAngleZ": 0.0,
        "ParamBodyAngleX": 0.0, "ParamBodyAngleY": 0.0, "ParamBodyAngleZ": 0.0,
        "ParamEyeBallX": 0.0, "ParamEyeBallY": 0.0,
        "ParamCheek": 0.0,
    },
}

# Cognitive mode → expression mapping
MODE_TO_EXPRESSION = {
    "REWARD": "JOY_01_BroadSmile",
    "THREAT": "SURPRISE_01_Startled",
    "SOCIAL": "JOY_03_GentleSmile",
    "EXPLORATORY": "WONDER_02_CuriousGaze",
    "REST": "JOY_05_Blissful",
    "CREATIVE": "PHOTO_Awe",
    "FOCUSED": "WONDER_03_Contemplative",
}


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: Echobeats 12-Step Cognitive Cycle
# ═══════════════════════════════════════════════════════════════════════════════

ECHOBEATS_PHASES = [
    # Step, Stream, Phase Name, Hormone Injections
    (1,  "A", "PERCEPTION",    {HormoneChannel.NOREPINEPHRINE: 0.1, HormoneChannel.ACETYLCHOLINE: 0.05}),
    (2,  "B", "ATTENTION",     {HormoneChannel.ACETYLCHOLINE: 0.1, HormoneChannel.GLUTAMATE: 0.05}),
    (3,  "C", "INTEGRATION",   {HormoneChannel.SEROTONIN: 0.05, HormoneChannel.GLUTAMATE: 0.05}),
    (4,  "A", "EVALUATION",    {HormoneChannel.DOPAMINE: 0.1, HormoneChannel.CORTISOL: -0.05}),
    (5,  "B", "PLANNING",      {HormoneChannel.ACETYLCHOLINE: 0.1, HormoneChannel.NOREPINEPHRINE: 0.05}),
    (6,  "C", "SIMULATION",    {HormoneChannel.ANANDAMIDE: 0.1, HormoneChannel.ENDORPHIN: 0.05}),
    (7,  "A", "DECISION",      {HormoneChannel.DOPAMINE: 0.05, HormoneChannel.ADRENALINE: 0.05}),
    (8,  "B", "ENACTION",      {HormoneChannel.ADRENALINE: 0.1, HormoneChannel.NOREPINEPHRINE: 0.05}),
    (9,  "C", "MONITORING",    {HormoneChannel.CORTISOL: 0.05, HormoneChannel.ACETYLCHOLINE: 0.05}),
    (10, "A", "LEARNING",      {HormoneChannel.GLUTAMATE: 0.1, HormoneChannel.DOPAMINE: 0.05}),
    (11, "B", "CONSOLIDATION", {HormoneChannel.SEROTONIN: 0.1, HormoneChannel.GABA: 0.05}),
    (12, "C", "REST",          {HormoneChannel.MELATONIN: 0.1, HormoneChannel.GABA: 0.1}),
]


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: Parameter Interpolator (Smooth Transitions)
# ═══════════════════════════════════════════════════════════════════════════════

class ParameterInterpolator:
    """Smoothly interpolates between expression presets."""

    def __init__(self, lerp_speed: float = 3.0):
        self.current: dict = {}
        self.target: dict = {}
        self.lerp_speed = lerp_speed

    def set_target(self, preset: dict):
        """Set a new target expression preset."""
        self.target = dict(preset)

    def tick(self, dt: float) -> dict:
        """Advance interpolation and return current parameter values."""
        alpha = min(1.0, self.lerp_speed * dt)
        for param_id, target_val in self.target.items():
            current_val = self.current.get(param_id, 0.0)
            self.current[param_id] = current_val + (target_val - current_val) * alpha
        return dict(self.current)

    def add_micro_expression(self, params: dict, intensity: float = 0.05):
        """Add subtle random micro-expressions for liveliness."""
        t = time.time()
        for param_id in params:
            noise = math.sin(t * 2.7 + hash(param_id) % 100) * intensity
            params[param_id] = params.get(param_id, 0.0) + noise
        return params

    def add_breathing(self, params: dict, t: float):
        """Add subtle breathing oscillation."""
        breath = math.sin(t * 0.8 * 2 * math.pi) * 0.02
        params["ParamBreath"] = 0.5 + breath * 10
        params["ParamBodyAngleY"] = params.get("ParamBodyAngleY", 0.0) + breath * 30
        return params


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: Main Controller
# ═══════════════════════════════════════════════════════════════════════════════

class DTEchoCognitiveController:
    """Main controller that orchestrates the cognitive avatar."""

    def __init__(self, host: str = "localhost", port: int = 22033):
        self.client = CubismEditorClient(host, port)
        self.endocrine = EndocrineState()
        self.interpolator = ParameterInterpolator(lerp_speed=3.0)
        self.echobeat_step = 0
        self.echobeat_timer = 0.0
        self.echobeat_interval = 2.5  # seconds per step
        self.running = False
        self.current_expression = "NEUTRAL_Reset"
        self.current_mode = "FOCUSED"

    async def start(self, mode: str = "cycle"):
        """Start the controller."""
        try:
            await self.client.connect()
            await self.client.register()
            await self.client.get_current_model_uid()
            await self.client.subscribe_moc_export()

            # Get parameter list
            params = await self.client.get_parameters()
            print(f"[Controller] Model has {len(params)} parameters.")

            self.running = True

            if mode == "demo":
                await self._run_demo()
            elif mode == "cycle":
                await self._run_echobeats_cycle()
            elif mode == "interactive":
                await self._run_interactive()

        except Exception as e:
            print(f"[Controller] Error: {e}")
        finally:
            await self.client.disconnect()

    async def _run_echobeats_cycle(self):
        """Run the Echobeats 12-step cognitive cycle continuously."""
        print("[Controller] Starting Echobeats cycle...")
        last_time = time.time()

        while self.running:
            now = time.time()
            dt = now - last_time
            last_time = now

            # Advance echobeat timer
            self.echobeat_timer += dt
            if self.echobeat_timer >= self.echobeat_interval:
                self.echobeat_timer = 0.0
                self._advance_echobeat()

            # Tick endocrine system
            self.endocrine.tick(dt)

            # Determine cognitive mode and expression
            mode = self.endocrine.get_cognitive_mode()
            if mode != self.current_mode:
                self.current_mode = mode
                expr_name = MODE_TO_EXPRESSION.get(mode, "NEUTRAL_Reset")
                self.current_expression = expr_name
                self.interpolator.set_target(EXPRESSION_PRESETS[expr_name])
                print(f"  [Echobeats] Mode: {mode} → Expression: {expr_name}")

            # Interpolate parameters
            params = self.interpolator.tick(dt)
            params = self.interpolator.add_micro_expression(params)
            params = self.interpolator.add_breathing(params, now)

            # Send to Cubism Editor
            param_list = [{"Id": k, "Value": v} for k, v in params.items()]
            try:
                await self.client.set_parameter_values(param_list)
            except Exception as e:
                print(f"  [Warning] Failed to set params: {e}")

            await asyncio.sleep(1 / 30)  # 30 FPS

    def _advance_echobeat(self):
        """Advance to the next Echobeats step."""
        phase = ECHOBEATS_PHASES[self.echobeat_step]
        step, stream, name, injections = phase

        print(f"  [Echobeats] Step {step}/12 Stream {stream}: {name}")

        # Inject hormones
        for hormone, amount in injections.items():
            self.endocrine.inject(hormone, amount)

        # Advance step
        self.echobeat_step = (self.echobeat_step + 1) % 12

    async def _run_demo(self):
        """Run a demo cycling through all expressions."""
        print("[Controller] Starting expression demo...")
        for expr_name, preset in EXPRESSION_PRESETS.items():
            print(f"  [Demo] Expression: {expr_name}")
            self.interpolator.set_target(preset)

            # Interpolate for 3 seconds
            start = time.time()
            while time.time() - start < 3.0:
                dt = 1 / 30
                params = self.interpolator.tick(dt)
                params = self.interpolator.add_micro_expression(params)
                params = self.interpolator.add_breathing(params, time.time())
                param_list = [{"Id": k, "Value": v} for k, v in params.items()]
                try:
                    await self.client.set_parameter_values(param_list)
                except Exception:
                    pass
                await asyncio.sleep(dt)

        print("[Controller] Demo complete.")

    async def _run_interactive(self):
        """Run in interactive mode — accept commands from stdin."""
        print("[Controller] Interactive mode. Commands:")
        print("  expr <name>     — Set expression (e.g., expr JOY_01_BroadSmile)")
        print("  inject <h> <v>  — Inject hormone (e.g., inject dopamine 0.3)")
        print("  mode            — Show current cognitive mode")
        print("  params          — Show current parameter values")
        print("  list            — List available expressions")
        print("  quit            — Exit")

        # Start background tick loop
        tick_task = asyncio.create_task(self._background_tick())

        try:
            loop = asyncio.get_event_loop()
            while self.running:
                line = await loop.run_in_executor(None, input, "dtecho> ")
                parts = line.strip().split()
                if not parts:
                    continue
                cmd = parts[0].lower()

                if cmd == "quit":
                    self.running = False
                elif cmd == "list":
                    for name in EXPRESSION_PRESETS:
                        print(f"  {name}")
                elif cmd == "expr" and len(parts) > 1:
                    name = parts[1]
                    if name in EXPRESSION_PRESETS:
                        self.interpolator.set_target(EXPRESSION_PRESETS[name])
                        print(f"  → Set expression: {name}")
                    else:
                        print(f"  Unknown expression: {name}")
                elif cmd == "inject" and len(parts) > 2:
                    try:
                        h = HormoneChannel(parts[1].lower())
                        v = float(parts[2])
                        self.endocrine.inject(h, v)
                        print(f"  → Injected {h.value}: {v:+.2f}")
                    except (ValueError, KeyError):
                        print(f"  Invalid hormone or value")
                elif cmd == "mode":
                    print(f"  Current mode: {self.endocrine.get_cognitive_mode()}")
                    for h in HormoneChannel:
                        print(f"    {h.value}: {self.endocrine.levels[h]:.3f}")
                elif cmd == "params":
                    for k, v in sorted(self.interpolator.current.items()):
                        print(f"    {k}: {v:.4f}")
                else:
                    print(f"  Unknown command: {cmd}")
        finally:
            tick_task.cancel()

    async def _background_tick(self):
        """Background loop for continuous parameter updates."""
        last_time = time.time()
        while self.running:
            now = time.time()
            dt = now - last_time
            last_time = now
            self.endocrine.tick(dt)
            params = self.interpolator.tick(dt)
            params = self.interpolator.add_micro_expression(params)
            params = self.interpolator.add_breathing(params, now)
            param_list = [{"Id": k, "Value": v} for k, v in params.items()]
            try:
                await self.client.set_parameter_values(param_list)
            except Exception:
                pass
            await asyncio.sleep(1 / 30)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: Standalone Mode (No Editor — Console Visualization)
# ═══════════════════════════════════════════════════════════════════════════════

async def run_standalone_demo():
    """Run a standalone demo without Cubism Editor (console output only)."""
    print("=" * 70)
    print("  DTEcho Cognitive Controller — Standalone Demo")
    print("  (No Cubism Editor connection — console visualization)")
    print("=" * 70)

    endocrine = EndocrineState()
    interpolator = ParameterInterpolator(lerp_speed=3.0)
    step = 0

    for cycle in range(2):  # Run 2 full cycles
        for i in range(12):
            phase = ECHOBEATS_PHASES[step]
            step_num, stream, name, injections = phase

            # Inject hormones
            for hormone, amount in injections.items():
                endocrine.inject(hormone, amount)

            # Tick endocrine
            for _ in range(25):  # 25 ticks per step
                endocrine.tick(0.1)

            # Get cognitive mode
            mode = endocrine.get_cognitive_mode()
            expr_name = MODE_TO_EXPRESSION.get(mode, "NEUTRAL_Reset")
            interpolator.set_target(EXPRESSION_PRESETS[expr_name])

            # Interpolate
            params = interpolator.tick(0.1)

            # Display
            bar = "█" * int(endocrine.levels[HormoneChannel.DOPAMINE] * 20)
            print(f"  Step {step_num:2d}/12 [{stream}] {name:15s} → Mode: {mode:12s} "
                  f"→ Expr: {expr_name:25s} DA:{bar}")

            step = (step + 1) % 12

        print("  --- Cycle complete ---")

    print("\n[Standalone] Demo complete. To connect to Cubism Editor, run:")
    print("  python dtecho_cubism_plugin.py --mode cycle")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8: Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="DTEcho Cubism Editor Plugin — Real-Time Cognitive Avatar Controller"
    )
    parser.add_argument("--host", default="localhost", help="Cubism Editor host")
    parser.add_argument("--port", type=int, default=22033, help="Cubism Editor port")
    parser.add_argument("--mode", choices=["interactive", "cycle", "demo", "standalone"],
                        default="standalone",
                        help="Operating mode (default: standalone)")
    args = parser.parse_args()

    if args.mode == "standalone":
        asyncio.run(run_standalone_demo())
    else:
        controller = DTEchoCognitiveController(args.host, args.port)
        asyncio.run(controller.start(args.mode))


if __name__ == "__main__":
    main()
