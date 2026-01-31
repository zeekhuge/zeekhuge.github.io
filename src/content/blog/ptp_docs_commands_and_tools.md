---
title: 'PTP - Programming The PRUs 2: Docs, Commands and Tools'
description: Tools and commands that will help you while working with PRUs
date: 2016-07-17T18:07:27.000Z
authors:
  - zeekhuge
image: /cardheaderimages/rproc_dmesg.png
tags:
  - beagleboneblack
  - PRUs
  - programming
  - C/C++
  - embedded programming
  - post
---

![Tools](/jokes/tools.png)

picture credits : [xkcd.com](https://xkcd.com)

---
---

### <u>Preface:</u>
If the content here seems to be out of context, you'll probably want to start from [here](/blog/ptp_blinky). 

So you have decided to play with PRUs and after this [blinky](/blog/ptp_blinky) post, you have some understanding about how to work with PRUs. Cool ! Thats a courageous decision, as PRUs are quite challenging. To make life easier, we need some tools to work along. This post will help you make some of your own tools, using mostly bash scripts/aliases, and explain how to use other known tools with PRUs. Please note that some of the tools/use-cases will not make sense as of now, but I will still include them in the post for future reference. Some of these tools might seem very trivial, but I would still like to mention them (it may give hope to someone :) )

---

### <u>Contents</u>
* [Documents](#docs)
	* AM335x PRU-ICSS Reference Guide
* [Commands](#cmd)
	* [Power management : PRUs : Details](#pmd)
	* [Power management : PRUs : Commands](#pmc)
		* To shut PRU core 1
		* To shut PRU core 0
		* To boot PRU core 1
		* To boot PRU core 0
		* To reboot both PRU cores
	* [PRU debug : Details](#pdd)
	* [PRU debug : Commands](#pdc)
		* ppause1 and ppause0 - to pause the PRUs
		* presume1 and presume0 - to resume the PRUs
		* pnext1 and pnext0 - to execute the next step
		* pregs1 and pregs0 - to read the debug register content of the PRUs
* [Tools](#tools)
	* [dmesg : kernel logs and the PRU](#dmesg)
* [fin](#fin)

---
---

### <u>Documents</u>{#docs}
* You definitely know that the AM335x processor is manufactured by TI, and only they know what actually is inside the semiconductor. To tell this to the world, every semiconductor device, open to the world, comes with some kind of document explaining its internal working. For PRUs, I found the document at https://github.com/beagleboard/am335x_pru_package/. The pdf named am335xPruReferenceGuide.pdf is the one I am talking about. Its an ultimately important and nice document to keep with you. I use it all the time, when I am working with PRUs. If you want to download this click [here](https://github.com/beagleboard/am335x_pru_package/raw/master/am335xPruReferenceGuide.pdf).

---

### <u>Commands</u>{#cmd}
* In this section, we will add some commands to use them as our tools. **Please note that these commands may not be very clean, but they definitely server the purpose. When you will execute them, they might produce some output, but dont worry much about it, we can use 'dmesg' to do the real debugging and monitor what is happening as I have explained below in the post**. There will be an explanation about the working of the commands also. 

---

##### <u>Power management : PRUs : Details</u>{#pmd}
* This [blinky post](/blog/ptp_blinky/) demonstrated how the deploy.sh script reboots the PRU. Now if you are deciding to play with PRUs frequently, there needs to be a tool to shut them down and boot them up, when needed, without doing the force rmmod of the pru_rproc. Now the remoteproc driver for PRUs, pru_proc handles the PRU core. It further exposes sysfs entries to boot and shutdown PRUs. So for PRU0 you can shut it down like this :

```

$ echo "4a334000.pru0" > /sys/bus/platform/drivers/pru-rproc/unbind

```

and boot it up :

```

$ echo "4a334000.pru0" > /sys/bus/platform/drivers/pru-rproc/bind

```


* At this point, you would want to make this **note that the device name of PRU core 0 is actually <u>4a334000.pru0</u> and that of the PRU core 1 is <u>4a338000.pru1</u>.** 

* So writing the device name of any of the pru cores to the 'bind' sysfs entry will make the remoteproc driver to boot that pru core. Similarly, writing a pru device name to 'unbind' sysfs entry will make that pru core to shutdown.

##### <u>Power management : PRUs : Commands</u>{#pmc}
* While working, I really don't like to type this long instruction to shutdown or boot the PRU. What I do is, I have added some aliases to my ~/.bashrc script, and believe me, they really make things easy. Just open the ~/.bash.rc in your favorite editor and append it with following aliases.

	+ **pshut1 : To shut PRU core 1** 
	
```

	alias pshut1='echo 4a338000.pru1>/sys/bus/platform/drivers/pru-rproc/unbind && echo “Core 1 is off”'
	
```



	+ **pshut0 : To shut PRU core 0**
	
```

	alias pshut0='echo 4a334000.pru0>/sys/bus/platform/drivers/pru-rproc/unbind && echo “Core 0 is off”'
	
```

	
	
	+ **pboot1 : To boot PRU core 1**
	
```

	alias pboot1='echo 4a338000.pru1>/sys/bus/platform/drivers/pru-rproc/bind && echo “Core 1 is on”'
	
```

	
	+ **pboot0 : To boot PRU core 0**
	
```

	alias pboot0='echo 4a334000.pru0>/sys/bus/platform/drivers/pru-rproc/bind && echo “Core 0 is on”'
	
```

	
	
	+ **preboot : To reboot both PRU cores**
	
```

	alias preboot='echo 4a338000.pru1>/sys/bus/platform/drivers/pru-rproc/unbind &&
	               echo 4a334000.pru0>/sys/bus/platform/drivers/pru-rproc/unbind &&
	               echo 4a338000.pru1>/sys/bus/platform/drivers/pru-rproc/bind &&
	               echo 4a334000.pru0>/sys/bus/platform/drivers/pru-rproc/bind &&
	               echo "PRUs rebooted"'
	
```



##### <u>PRU debug : Details</u>{#pdd}
* Now here comes the interesting section. The PRUs are usually seen as these 'black boxes' as no one knows what is happening inside it. With the latest remoteproc, this is not true. We can actually see the content of the PRU registers or we can pru execute one instruction at a time, and then wait for the user for a instruction to execute next instruction. The pru_rproc driver exposes these debugfs entries :

```

$ root@beaglebone:/sys/kernel/debug/remoteproc# tree remoteproc0 
remoteproc0
|-- name
|-- recovery
|-- state
|-- trace0
`-- version
`
0 directories, 5 files
root@beaglebone:/sys/kernel/debug/remoteproc# tree remoteproc1
remoteproc1
|-- name
|-- recovery
|-- regs
|-- single_step
|-- state
`-- version
`
0 directories, 6 files

```


* **NOTE that all these entries will appear only when the associated PRU is properly booted.** So remoteproc1 is associated with PRU1 and remoteproc0 is associated with PRU0.

* PRUs have this nice feature called the SINGLE_STEP mode. When activated in this mode, the PRU core executes one instruction, waits for a kind of flag from the user, executes the next instruction and this continues. To get PRU0 in the SINGLE_STEP mode, just :

```

$ echo 1 > /sys/kernel/debug/remoteproc/remoteproc0/single_step

```

and for PRU1 it will be 

```

$ echo 1 > /sys/kernel/debug/remoteproc/remoteproc1/single_step

```

So basically, writing 0 to the single_step entry, changes the PRU mode to continuous mode and writing a non-zero value starts the single_step mode. Internally, writing to single_step entry writes to the SINGLE_STEP field of the CONTROL register in the PRU_CTRL register set.

* Like any other computing system, PRUs has got a set of register and data-structures, for various purposes. Some of these are:
	+ **General Purpose registers.** So each PRU core has got this set of 32 general purpose register. While programming PRUs in C/C++, the compiler makes use of these registers for various purposes and one cant actually access a single register in C/C++, exception being the R31 and R30 register. But when programming them in Assembly, having something to peek into the contents of these register can be very useful tool. When the PRU is disabled, that is, it is not in continuous mode of fetching next instruction, the Kernel can actually read the content of these general purpose register.
	+ **PRU_CONTROL register.** PRUs has this set of registers called PRU_CTRL (read it PRU control) registers. It consists of CONTROL, STATUS, WAKEUP_EN, CYCLE, STALL, CTBIR0, CTBIR1, CTPPR0 and CTPPR1 register. The control various subsystems and accesses. The kernel can, at anytime read the content of these registers. By 'anytime' I mean that the PRU does not need to be disabled to read this register set.
	+ **PRU constant table.** This data structure contains the address of various subsystem that are most commonly used by the PRUs. Some of its entries can also be configured using the PRU_CTR registers. Programming in C/C++ removes the need of any access to this structure, it internally manages everything (except in a few cases). But if needed, the kernel can read the content of the constant table too, provided, the pru is disabled.

* To disable the PRUs, what one can do from userspace is, just write a non-zero value to the single_step debugfs entry, the PRU will execute one instruction and then will disable itself until you again write a value to the entry. In fact this is how the single_step mode works.

* After disabling the PRU, you can use the 'regs' entry to read the register content values.

```

$ cat /sys/kernel/debug/remoteproc/remoteproc1/regs
============== Control Registers ==============
CTRL      := 0x00000101
STS (PC)  := 0x00000028 (0x000000a0)
WAKEUP_EN := 0x00000000
CYCLE     := 0x00000000
STALL     := 0x00000000
CTBIR0    := 0x00000000
CTBIR1    := 0x00000000
CTPPR0    := 0x00000000
CTPPR1    := 0x00000000
=============== Debug Registers ===============
GPREG0  := 0x7fff8000	CT_REG0  := 0x00020000
GPREG1  := 0x9e103100	CT_REG1  := 0x48040000
GPREG2  := 0x000002ac	CT_REG2  := 0x4802a000
GPREG3  := 0x0035003b	CT_REG3  := 0x00030000
GPREG4  := 0x00020024	CT_REG4  := 0x00026000
GPREG5  := 0x00000300	CT_REG5  := 0x48060000
GPREG6  := 0xdfd3df83	CT_REG6  := 0x48030000
GPREG7  := 0xf9c1a30b	CT_REG7  := 0x00028000
GPREG8  := 0x215e3af4	CT_REG8  := 0x46000000
GPREG9  := 0x2868c478	CT_REG9  := 0x4a100000
GPREG10 := 0x26e01c54	CT_REG10 := 0x48318000
GPREG11 := 0xaf704e74	CT_REG11 := 0x48022000
GPREG12 := 0x51588e6f	CT_REG12 := 0x48024000
GPREG13 := 0x667bc7c2	CT_REG13 := 0x48310000
GPREG14 := 0x0000ffff	CT_REG14 := 0x481cc000
GPREG15 := 0x00000290	CT_REG15 := 0x481d0000
GPREG16 := 0x0000028c	CT_REG16 := 0x481a0000
GPREG17 := 0x00000000	CT_REG17 := 0x4819c000
GPREG18 := 0x000002ac	CT_REG18 := 0x48300000
GPREG19 := 0x000a6465	CT_REG19 := 0x48302000
GPREG20 := 0x02100000	CT_REG20 := 0x48304000
GPREG21 := 0x01120011	CT_REG21 := 0x00032400
GPREG22 := 0x0000001e	CT_REG22 := 0x480c8000
GPREG23 := 0x00000000	CT_REG23 := 0x480ca000
GPREG24 := 0x75727265	CT_REG24 := 0x00000000
GPREG25 := 0x64657470	CT_REG25 := 0x00002000
GPREG26 := 0x6e616843	CT_REG26 := 0x0002e000
GPREG27 := 0x206c656e	CT_REG27 := 0x00032000
GPREG28 := 0x49003033	CT_REG28 := 0x00000000
GPREG29 := 0x7265746e	CT_REG29 := 0x49000000
GPREG30 := 0xe5e2782f	CT_REG30 := 0x40000000
GPREG31 := 0x80000000	CT_REG31 := 0x80000000

```

In the above output
	+ GPREGn refers to the nth general prupose register
	+ CT_REGn refers to the nth content of the constant table.
	+ And the 'Control Registers' section displays the content of the PRU_CTRL registers.

##### <u>PRU debug : Commands</u>{#pdc}
* So here comes the set of aliases that I use to control PRUs for debugging. Just append them to your ~/.bashrc file and the will be in effect you login next time.
	+ **ppause1 and ppause0 - to pause the PRUs.** This basically changes the mode of the PRUs to single_step mode. PRUs execute one instruction and then gets paused
	
```

	alias ppause1='echo 1 > /sys/kernel/debug/remoteproc/remoteproc1/single_step'
	alias ppause0='echo 1 > /sys/kernel/debug/remoteproc/remoteproc0/single_step'
	
```


	+ **presume1 and presume0 - to resume the PRUs.** Internally this brings back the PRU to continuous mode of operation.
	
```

	alias presume1='echo 0 > /sys/kernel/debug/remoteproc/remoteproc1/single_step'
	alias presume0='echo 0 > /sys/kernel/debug/remoteproc/remoteproc0/single_step'
	
```


	+ **pnext1 and pnext0 - to execute the next step.** This starts the single_step mode of the PRUs and execute one next step each time invoked.
	
```

	alias pnext1='echo 1 > /sys/kernel/debug/remoteproc/remoteproc1/single_step'
	alias pnext0='echo 1 > /sys/kernel/debug/remoteproc/remoteproc0/single_step'
	
```


	+ **pregs1 and pregs0 - to read the debug register content of the PRUs.** If you want to read all the register content, the PRU need to paused before the call to this alias. If it is not paused, only the PRU_CONTROL register content will be printed out.
	
```

	alias pregs1='cat /sys/kernel/debug/remoteproc/remoteproc1/regs'
	alias pregs0='cat /sys/kernel/debug/remoteproc/remoteproc0/regs'
	
```



----
----

### <u>Tools</u>{#tools}
* Well, after all these commands/aliases we just added in the above section, I have one tool left for you that is 'dmesg'.

##### <u>dmesg : kernel logs and the PRU</u>{#dmesg}
* Yeah, I know that you already know this, but believe me, this 'dmesg' point this blog can prove to save many hours(and probably lives). OK so you think I am just wasting up space mentioning this point here ? really ? well, then just let me use some more of it :P

* Whenever I start working with the PRUs, what I usually do is, open up a new terminal, ssh into the BBB, change the title of the terminal to 'BBB dmesg' to make it easy to switch between 10-12 terminals, and then execute this command :

```

$ dmesg -Hw

```

What it does is that it waits for new kernel log messages and prints them as they arrive. It also makes the output a bit colorful. 

* On booting or shutting down the PRUs, the remoteproc drivers print some kernel logs. These kernel log messages can be used to check if the firmware gets loaded on the PRU. 
	+ Kernel log messages when the PRUs are booted up :
	
```

	[  +5.822834]  remoteproc1: 4a334000.pru0 is available
	[  +0.005249]  remoteproc1: Note: remoteproc is still under development and considered experimental.
	[  +0.009165]  remoteproc1: THE BINARY FORMAT IS NOT YET FINALIZED, and backward compatibility isn't yet guaranteed.
	[  +0.019388] pru-rproc 4a334000.pru0: booting the PRU core manually
	[  +0.006738]  remoteproc1: powering up 4a334000.pru0
	[  +0.011898]  remoteproc1: Booting fw image am335x-pru0-fw, size 32292
	[  +0.006832]  remoteproc1: remote processor 4a334000.pru0 is now up
	[  +0.006434] pru-rproc 4a334000.pru0: PRU rproc node /ocp/pruss@4a300000/pru0@4a334000 probed successfully
	[  +0.022337]  remoteproc2: 4a338000.pru1 is available
	[  +0.005196]  remoteproc2: Note: remoteproc is still under development and considered experimental.
	[  +0.009167]  remoteproc2: THE BINARY FORMAT IS NOT YET FINALIZED, and backward compatibility isn't yet guaranteed.
	[  +0.017694] pru-rproc 4a338000.pru1: booting the PRU core manually
	[  +0.006884]  remoteproc2: powering up 4a338000.pru1
	[  +0.011585]  remoteproc2: Booting fw image am335x-pru1-fw, size 32292
	[  +0.006809]  remoteproc2: remote processor 4a338000.pru1 is now up
	[  +0.006440] pru-rproc 4a338000.pru1: PRU rproc node /ocp/pruss@4a300000/pru1@4a338000 probed successfully
	
```

	 This message can be a bit different for complex and different firmwares, but the important point to note here is the loading of the firmware onto the PRUs. The line in the dmesg that shows this is: 
	
```

	[  +0.006832]  remoteproc1: remote processor 4a334000.pru0 is now up
	[  +0.006434] pru-rproc 4a334000.pru0: PRU rproc node /ocp/pruss@4a300000/pru0@4a334000 probed successfully
	
```

and 
	
```

	[  +0.006884]  remoteproc2: powering up 4a338000.pru1
	[  +0.011585]  remoteproc2: Booting fw image am335x-pru1-fw, size 32292
	
```


	+ Kernel log message when the PRUs get shutdown :
	
```

	[Jul17 15:40] pru-rproc 4a334000.pru0: pru_rproc_remove: removing rproc 4a334000.pru0
	[  +0.007909] pru-rproc 4a334000.pru0: stopping the manually booted PRU core
	[  +0.017800] ti-pruss 4a300000.pruss: unconfigured system_events = 0xffffffffffffffff host_intr = 0x00000001
	[  +0.010081]  remoteproc1: stopped remote processor 4a334000.pru0
	[  +0.012963]  remoteproc1: releasing 4a334000.pru0
	[  +0.010409] pru-rproc 4a338000.pru1: pru_rproc_remove: removing rproc 4a338000.pru1
	[  +0.007950] pru-rproc 4a338000.pru1: stopping the manually booted PRU core
	[  +0.015339] ti-pruss 4a300000.pruss: unconfigured system_events = 0xffffffffffffffff host_intr = 0x00000001
	[  +0.010043]  remoteproc2: stopped remote processor 4a338000.pru1
	[  +0.012716]  remoteproc2: releasing 4a338000.pru1
	
```


	+ Kernel log messages when the firmware could not be loaded onto the PRUs :

```

[Jul17 15:45]  remoteproc1: 4a334000.pru0 is available
[  +0.005235]  remoteproc1: Note: remoteproc is still under development and considered experimental.
[  +0.009203]  remoteproc1: THE BINARY FORMAT IS NOT YET FINALIZED, and backward compatibility isn't yet guaranteed.
[  +0.019418]  remoteproc1: Direct firmware load for am335x-pru0-fw failed with error -2
[  +0.008195]  remoteproc1: failed to load am335x-pru0-fw
[  +0.010259] pru-rproc 4a334000.pru0: booting the PRU core manually
[  +0.006529]  remoteproc1: powering up 4a334000.pru0
[  +0.013469]  remoteproc1: Direct firmware load for am335x-pru0-fw failed with error -2
[  +0.008150]  remoteproc1: request_firmware failed: -2
[  +0.005235] pru-rproc 4a334000.pru0: rproc_boot failed
[  +0.012949]  remoteproc1: releasing 4a334000.pru0
[  +0.005070] pru-rproc: probe of 4a334000.pru0 failed with error -2
[  +0.012818]  remoteproc1: 4a338000.pru1 is available
[  +0.005158]  remoteproc1: Note: remoteproc is still under development and considered experimental.
[  +0.009091]  remoteproc1: THE BINARY FORMAT IS NOT YET FINALIZED, and backward compatibility isn't yet guaranteed.
[  +0.014271]  remoteproc1: Direct firmware load for am335x-pru1-fw failed with error -2
[  +0.008084]  remoteproc1: failed to load am335x-pru1-fw
[  +0.007755] pru-rproc 4a338000.pru1: booting the PRU core manually
[  +0.009969]  remoteproc1: powering up 4a338000.pru1
[  +0.005178]  remoteproc1: Direct firmware load for am335x-pru1-fw failed with error -2
[  +0.008057]  remoteproc1: request_firmware failed: -2
[  +0.005121] pru-rproc 4a338000.pru1: rproc_boot failed
[  +0.009849]  remoteproc1: releasing 4a338000.pru1
[  +0.005094] pru-rproc: probe of 4a338000.pru1 failed with error -2

```

	This is mostly when there is no file like am335x-pru1-fw or am335x-pru0-fw available inside the /lib/firmware/ directory.
	
### <u>fin</u>{#fin}
* So, with these tools, I hope that that your learning speed gets faster and the process gets much easier. I would close this post with these lines of Abraham Lincoln

 ***"Give me Six hours to chop down a tree and I will spend
first four sharpening the axe"***

