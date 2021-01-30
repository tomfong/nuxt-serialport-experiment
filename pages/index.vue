<template>
  <v-container class="root-container gleneagles-theme">
    <v-row justify="center" align="center">
      <v-col justify="center" align="center">
        <h1 v-if="!isDeviceConnected">Welcome, Please connect QR code scanner</h1>
        <h1 v-if="isDeviceConnected">Welcome, connected PortName = {{ connectedPortName }}</h1>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <h1 v-for="(record, index) in scannedRecords" :key="index">{{ index + '. ' + record }}</h1>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>

export default {
  components: {},
  data: () => ({
    isDeviceConnected: false,
    connectedPortName: '',
    scannedRecords: []
  }),
  mounted () {
    this.socket = this.$nuxtSocket({
      name: "main"
    });
    this.socket.emit('check-scanner', () => {});
    this.socket.on('scanned-data', (strData) => {
      console.log('client receive scanned-data')
      this.scannedRecords.push(strData);
    });
    this.socket.on('scanner-connected', (portName) => {
      console.log('client receive scanner-connected')
      this.isDeviceConnected = true;
      this.connectedPortName = portName;
    });
    this.socket.on('scanner-disconnected', () => {
      console.log('client receive scanner-disconnected')
      this.isDeviceConnected = false;
    })
  }
};
</script>
<style scoped>
.root-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.gleneagles-theme {
  background: #007592;
  color: white;
}
</style>
