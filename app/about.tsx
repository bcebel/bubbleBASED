import { ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import Head from "expo-router/head";

export default function AboutScreen() {
  return (
    <>
      <Head>
        <title>About ebubbl 🫧</title>
        <meta name="description" content="🫧 About ebubbl" />
      </Head>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>🫧 About ebubbl</Text>
        <Text style={styles.meta}>🫧 Version 2 · October 2026</Text>
        <Text style={styles.heading}>🫧. The People in Your Bubble.</Text>
        <Text style={styles.paragraph}>
          🫧 What if Facebook, Instagram, and Twitter were just a few bubbles in
          a larger network of bubbles? What if you could create your own bubble
          and invite only the people you want to see your content? What if you
          could join other people's bubbles and see their content without being
          tracked or having your data sold?
        </Text>
        <Text style={styles.paragraph}>
          🫧 ebubbl is a set of bubbles — contextual spaces where you choose
          who's in them and what you share. Some are for people you already
          know. Some are for people you'd like to meet.
        </Text>
        <Text style={styles.paragraph}>
          🫧 You decide who's in the room, and how public the room is. Bubbles
          can be intimate, professional, curious, or wide open — that's the
          point.
        </Text>
        <Text style={styles.heading}>🫧 Digital Bubbles Over Feeds</Text>
        <Text style={styles.paragraph}>
          🫧 What if we actually truly shared content with eachother instead of
          just broadcasting it to the world? When I say share I mean share the
          file through webtorrent, like Napster and Limewire did, but for social
          media. Who do you trust with your content with more than your friends?
          What if it was centralized with you at the center rippling out to your
          friends and their friends and so on. If everyone is the center it
          actually becomes a decentralized network of people sharing content
          with eachother.
        </Text>

        <Text style={styles.bullet}>
          🫧 Freedom of speech, sure. Platforms will give you 280 characters to
          say what you want but then shadowban it. Not here, you join bubbles
          you want to be in and you can say what you want. If you don't like
          what someone is saying, leave the bubble. If you don't like the
          bubble, leave the bubble. I don't even know the character limit for a
          post so write as much as you want.
        </Text>
        <Text style={styles.bullet}>
          🫧 Forcing you to buy a blue checksubscription so people see your content is not
          freedom of speech.
        </Text>
        <Text style={styles.heading}>🫧 We Are The Platform.</Text>
        <Text style={styles.paragraph}>
          🫧 Everyone is looking for an alternative to the big social media
          platforms. You want Substack, write away and publish it to the
          internet. You want Instagram? We have the galleries. You want X posts,
          we have the platform. You want meetup? Meet your friends here.
          Bluesky, Mastodon, and other federated platforms are great but they
          are still centralized and besides didn't Elon Musk just buy twitter /
          X from the Bluesky guy? They have enough money. And TikTok is a great
          platform but they are still centralized and they are still tracking
          you. You want OnlyFans? Make a private bubble. You want Discord and
          Slack? Make a work bubble and invite your team. You want a private
          bubble for your friends? Make a private bubble and invite your
          friends. You want a bubble for your community, school, family, church,
          club, team, organization, business, project or event? Put a bubble on
          it.
        </Text>
        <Text style={styles.paragraph}>
          🫧 Literally share your content. Simply put, we won't scan your face —
          and neither would your friends. Torrenting is public in the sense that
          your ip address is visible, but how many Flock cameras did you drive
          by today? Also having your ip address visible makes the platform safer
          for everyone.
        </Text>
        <Text style={styles.paragraph}>
          🫧 Community ads — users bring their own affiliate links in addition
          to platform ads, the app shares them along with the platform ads.
          We're in this together. Let's team up and do this.
        </Text>
        <Text style={styles.paragraph}>
          🫧 Livestream is set up using WebTorrent to broadcast to your bubbles.
          The more viewers there are the faster the connection. Great for real
          time events. Torrenting a stream makes it powerful for global
          communication.
        </Text>
        <Text style={styles.heading}>🫧 1. User Privacy Levels.</Text>
        <Text style={styles.paragraph}>
          🫧 You choose how visible your posts are. Bubbles choose how far they
          can travel. When they disagree, the more private one wins. There are
          bubble privacy options and user privacy options. User levels take
          priority over bubble levels unless bubble levels are more restrictive.
          There are 4 User privacy levels in ebubbl.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Private - What you share in bubble stays in that bubble.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Bublic - What you share in a bubble can only be seen by other
          users of ebubbl (must be logged in, can't be found by Google etc.).
          Bublic is the middle ground — visible to the community, not to the
          open web. It's the difference between telling a room and telling the
          whole internet.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Default - Setting your user profile to default your privacy
          levels will match what each bubble sets as their default.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Global - global publishes OUTSIDE of ebubbl and can be indexed by
          search engines. In this case the bubble's privacy levels would take
          precedence because a private bubble is privately scoped.
        </Text>
        <Text style={styles.heading}>🫧  2. Types of Bubbles</Text>
        <Text style={styles.bullet}>
          🫧 • Personal - Your own digital sanctuary, just you and your stuff.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Private - Not visible by anyone other than the creator of that
          bubble and the people who were invited to that bubble.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Bublic - Visible by any user of ebubbl. However private posts will
          not be seen unless you are a member of that bubble.
        </Text>
        <Text style={styles.bullet}>
          🫧 • Global - global bubbles are published OUTSIDE of ebubbl and can be
          indexed by search engines.
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
