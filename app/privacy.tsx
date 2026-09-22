import { ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import Head from "expo-router/head";

export default function PrivacyScreen() {
  return (
    <>
      <Head>
        <title>bubbleBASED - Privacy Policy</title>
        <meta
          name="description"
          content="How bubbleBASED handles your data. No selling, no tracking, no shadow profiles. Read the full policy."
        />
      </Head>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.meta}>
          Effective Date: 1/24/2025 · Last Updated: 1/24/2025
        </Text>

        <Text style={styles.paragraph}>
          bubbleBASED respects your privacy and is committed to protecting the
          information you share with us. This Privacy Policy describes how we
          collect, use, and protect your data.
        </Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We may collect the following information when you use bubbleBASED:
        </Text>
        <Text style={styles.bullet}>
          • Personal Information: Name, email address, or other data you
          provide.
        </Text>
        <Text style={styles.bullet}>
          • Device Information: IP address, device type, operating system, and
          unique device identifiers.
        </Text>
        <Text style={styles.bullet}>
          • Usage Data: Information about how you interact with the app.
        </Text>

        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use your data to:</Text>
        <Text style={styles.bullet}>• Provide and maintain our services.</Text>
        <Text style={styles.bullet}>
          • Improve app functionality and user experience.
        </Text>
        <Text style={styles.bullet}>
          • Respond to user inquiries and offer support.
        </Text>
        <Text style={styles.bullet}>• Ensure security and prevent fraud.</Text>

        <Text style={styles.heading}>3. Sharing Your Information</Text>
        <Text style={styles.paragraph}>
          BubbleBased uses peer-to-peer sharing. When you post media, your
          device helps share it with others in this bubble. Your IP address is
          visible to them while they're watching.  We do not sell or share your
          personal data with third parties except: with your consent, to comply
          with legal obligations, or with service providers who assist in
          operating our app.
        </Text>

        <Text style={styles.heading}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We use industry-standard measures to protect your data, but no system
          is 100% secure.
        </Text>

        <Text style={styles.heading}>5. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bullet}>
          • Access and review the data we collect about you.
        </Text>
        <Text style={styles.bullet}>• Request deletion of your data.</Text>
        <Text style={styles.bullet}>
          • Opt out of non-essential data collection.
        </Text>

        <Text style={styles.heading}>6. Third-Party Links and Services</Text>
        <Text style={styles.paragraph}>
          Our app may link to third-party websites or services. We are not
          responsible for their privacy practices. Please review their policies
          before sharing your information.
        </Text>

        <Text style={styles.heading}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          bubbleBASED is not intended for use by children under the age of 13.
          We do not knowingly collect personal information from children.
        </Text>

        <Text style={styles.heading}>8. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy. Changes will be posted with the
          "Last Updated" date.
        </Text>

        <Text style={styles.heading}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions, contact us at privacy@bubblebased.com.
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
