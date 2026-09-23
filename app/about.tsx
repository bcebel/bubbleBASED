import { ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import Head from "expo-router/head";

export default function AboutScreen() {
  return (
    <>
      <Head>
        <title>About bubbleBASED 🫧</title>
        <meta name="description" content="🫧 About bubbleBASED" />
      </Head>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>🫧 About bubbleBASED</Text>
        <Text style={styles.meta}>Version 1 · September 2026</Text>
        <Text style={styles.heading}>The People in Your Bubble.</Text>
        <Text style={styles.paragraph}>
          bubbleBASED is a set of bubbles — small, contextual spaces where you
          choose who's in them and what you share. Some are for people you
          already know. Some are for people you'd like to meet. All of them are
          yours to shape
        </Text>
        <Text style={styles.paragraph}>
          You decide who's in the room, and how public the room is. Bubbles can
          be intimate, professional, curious, or wide open — that's the point.
        </Text>
        <Text style={styles.heading}>Digital Bubbles Over Feeds</Text>
        <Text style={styles.paragraph}>
          That memory of home, that vacation. They are worth enjoying and
          sharing. Even if you just connect with a few of your besties for a few
          smiles it's worth it.
        </Text>

        <Text style={styles.bullet}>
          Context Matters. Your boss shouldn't see your vacation photos unless
          you want to specifically share them.
        </Text>
        <Text style={styles.heading}>We Are The Platform.</Text>
        <Text style={styles.paragraph}>
          When you post something, your device helps share it with the people
          who want to see it. Not a data center we pay for, not a company that
          gets to decide what stays online. The network is made of the people
          using it.
        </Text>
        <Text style={styles.paragraph}>
          Literally share your content. Simply put, we won't scan your face —
          and neither would your friends.
        </Text>
        <Text style={styles.paragraph}>
          Community ads — users bring their own affiliate links in addition to
          platform ads, the app shares them along with the platform ads. We're
          in this together. Let's team up and do this.
        </Text>
        <Text style={styles.paragraph}>
          Livestream is set up using WebTorrent to broadcast to your bubbles.
          The more viewers there are the faster the connection. Great for real
          time events.
        </Text>
        <Text style={styles.heading}>1. User Privacy Levels.</Text>
        <Text style={styles.paragraph}>
          You choose how visible your posts are. Bubbles choose how far they can
          travel. When they disagree, the more private one wins. There are
          bubble privacy options and user privacy options. User levels take
          priority over bubble levels unless bubble levels are more restrictive.
          There are 4 User privacy levels in bubbleBASED.
        </Text>
        <Text style={styles.bullet}>
          • Private - What you share in bubble stays in that bubble.
        </Text>
        <Text style={styles.bullet}>
          • Bublic - What you share in a bubble can only be seen by other users
          of bubbleBASED (must be logged in, can't be found by Google etc.).
          Bublic is the middle ground — visible to the community, not to the
          open web. It's the difference between telling a room and telling the
          whole internet.
        </Text>
        <Text style={styles.bullet}>
          • Default - Setting your user profile to default your privacy levels
          will match what each bubble sets as their default.
        </Text>
        <Text style={styles.bullet}>
          • Global - global publishes OUTSIDE of bubbleBASED and can be indexed
          by search engines. In this case the bubble's privacy levels would take
          precedence because a private bubble is privately scoped.
        </Text>
        <Text style={styles.heading}>2. Types of Bubbles</Text>
        <Text style={styles.bullet}>
          • Personal - Your own digital sanctuary, just you and your stuff.
        </Text>
        <Text style={styles.bullet}>
          • Private - Not visible by anyone other than the creator of that
          bubble and the people who were invited to that bubble.
        </Text>
        <Text style={styles.bullet}>
          • Bublic - Visible by any user of bubbleBASED. However private posts
          will not be seen unless you are a member of that bubble.
        </Text>
        <Text style={styles.bullet}>
          • Global - global bubbles are published OUTSIDE of bubbleBASED and can
          be indexed by search engines.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#130720",
  },
  content: {
    padding: 24,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    color: "#00ffff",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  meta: {
    color: "#888",
    fontSize: 13,
    marginBottom: 32,
    fontStyle: "italic",
  },
  heading: {
    color: "#FF00FF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 10,
  },
  paragraph: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  bullet: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 24,
    marginLeft: 12,
    marginBottom: 6,
  },
});
