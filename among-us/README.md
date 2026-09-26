# Sus Station

A single-player, Among Us-style game in one HTML file. You and seven bots crew a ship, and one or two players aboard are Impostors. It might be you.

## Roles

On the title screen, **Your role** decides what you play:

- **Random** (default): you get the same odds as every other seat, so with one Impostor you are the Impostor in about 1 game out of 8, and 1 in 4 with two.
- **Crewmate** or **Impostor** forces that role.

The role screen at the start tells you which one you got. As the Impostor you also see your partner's name in red.

## How to play as a crewmate

1. Pick your color, the number of Impostors, and your role, then press **Play**.
2. Walk to the yellow consoles and press **Use** to do your tasks. The bar at the top fills as the whole crew finishes tasks.
3. Find a body? Press **Report**. Something feels off? Press the red **emergency button** in Cafeteria (once per game).
4. In the meeting, read what the bots say, accuse someone from the quick-chat buttons, then vote or skip.

The crew wins when every task is done or every Impostor is voted out. The Impostors win when there are as many of them alive as crewmates. If you get killed, a kill animation shows who got you, and then you keep playing as a ghost. Your tasks still count.

## How to play as the Impostor

- Walk up to a crewmate and press **Kill** (Q) when the button lights up. The number on the button is the cooldown until your next kill (10 s at the start, 15 s after a meeting, 25 s after a kill).
- Every kill plays a kill animation. You land where your victim stood.
- Your task list is fake. Stand at those consoles to look busy.
- Bots within sight of a kill will report it and say they saw you. Bots near the body's room around that time will name you too. Kill where no one is watching, then walk away.
- In meetings, blame someone or give an alibi from the quick-chat buttons. You can also report your own kill.

## Controls

| Action | Keyboard | Touch / mouse |
| --- | --- | --- |
| Move | WASD or arrow keys | Drag anywhere on the ship |
| Use / emergency button | E or Space | Use button |
| Report a body | R | Report button |
| Kill (Impostor only) | Q | Kill button |
| Map | M | Map button |
| Close a task or the map | Esc | ✕ |

## Tasks

Fix Wiring, Swipe Card, Unlock Manifolds, Clear Asteroids, Download Data, Fuel Engines, Empty Garbage, Prime Shields, and Submit Scan. Each crewmate gets five, spread across 14 rooms.

## How the bots think

- Crewmate bots walk between their task consoles and take several seconds at each one. Every 0.4 s they note who they can see and which room that person is in.
- The Impostor waits out a kill cooldown, then hunts the nearest crewmate who is out of sight of everyone else. Sometimes it gets careless and kills where you can see it.
- In a meeting, each bot talks about what it actually saw: who was in or next to the body's room around the time of the kill. The Impostor makes up alibis and accuses crewmates at random.
- Votes weigh a bot's own sightings plus the accusations in chat. A bot that gets accused knows it is innocent, so the accuser starts to look guilty. That applies to you too.
- The same sightings work against you when you are the Impostor.
- If you saw the kill yourself, select the killer in the meeting and the quick-chat button changes to **I saw ... kill!**, which the bots take seriously.

## Running it

Open `index.html` in a browser. It needs no server and no install. Your color choice and win/loss record are saved in `localStorage` on your device.
