---
title: 'PTP - Programming The PRUs 1: Blinky'
description: Firts post in the PTP series.
date: 2016-07-16T10:15:08.000Z
authors:
  - zeekhuge
image: /cardheaderimages/rproc_dmesg.png
tags:
  - beagleboneblack
  - PRUs
  - programming
  - C/C++
  - post
---


**This is the first post in a series of posts that will try to put the PRU programming process in the simplest and the most logical form, connecting all the dots (rpmsg, remoteproc etc). The posts of this series will have PTP (Programming The Pru) at the beginning of its title. As its just the beginning, this post aims to get you a blinky application using PRUs on your BeagleBone Black.**

---------------------------------------------------

### <u>Preface</u>

Some people might say, *"Really ? A blinky ? Are you kidding me ? If someone is trying to get started with PRUs, he/she's most probably knows the concepts of embedded programming well."* And to them, I would just say *"yes, a blinky."*

However experienced an embedded programmer is, blinky can still be the most thrilling application that he develops. It is thrilling at least to me, and I just put my hands up in the air like I have won a war. Further, this post will help you get all the things at the right place to begin with more complex examples. If you still don't think its worth it, well, Its my post :P

----------------------------------------------------

### <u>Content</u>
* [Pointers - some miscellaneous and important points](#ptr)
* [Setup](#stp)
	* [Get the repo](#repo)
	* [Disable the HDMI cape](#hdmi)
	* [Available pins](#pins)
	* [LEDs on P8_45](#leds)
	* [Setting up the PRU code generation tool](#pcgt)
	* [Get blinky](#blin)
* [Into the code](#code)
	* [The C code : PRU_gpioToggle](#ccode)
		+ The __R31 and __R30 variables
		+ The __delay_cycles() function
	* [The linker file : PRU_gpioToggle/AM335x_PRU.cmd](#cmd)
	* [The deploy script : deploy.sh](#desh)
* [Whats next ?](#nxt)

### <u>Pointers</u>{#ptr}

* We will be dealing with latest kernels. The series of examples are expected to work on kernel version later than 4.4.12-ti-r31. To check what the latest kernel available is

```

$ sudo apt-get update
$ sudo apt-cache search 'linux-image-*-ti-*' | sort -V 

```

Out of the list that now appears, assuming the latest kernel image to be 4.4.12-ti-r31

```

$ export NEW=4.4.12-ti-r31
$ sudo apt-get install -y linux-firmware-image-$NEW linux-headers-$NEW linux-image-$NEW
$ reboot

```


* Since we all love Linux, and its standards that support scalability, no prussdrv talks.

* The example directory that we will be using is the 'examples/' directory from my GSoC project [here](https://github.com/ZeekHuge/BeagleScope).

* I will be adding the code/commands for all the steps here, but to make life easier, there is always this [cheat sheet](https://www.zeekhuge.me/blog/a_handfull_of_commands_and_scripts_to_get_started_with_beagleboneblack/)  you can refer to. 
* For any experiments you do with PRUs, remember that they can source very less current. Probably about 8mA, so keep that in mind. 

![Power](/jokes/ohm.png)

picture credits : [xkcd.com](https://xkcd.com)

* Hang on throughout the series, as it might get a bit daunting at times.


-----------------------------------------------


### <u>Setup</u>{#stp}

##### <u>Get the repo</u>{#repo}
* My GSoC 2016 project BeagleScope required understanding of PRU programming and its kernel interfacing. Since most of the things were documented in form of large PDFs I had to go through them and experiment a bit. The experiments are collected in the BeagleScop repo along with some documentation. To get the repo

```

$ git clone https://github.com/ZeekHuge/BeagleScope.git

```



-------------------------------------------------


##### <u>Disable the HDMI cape</u>{#hdmi}
* Why disable the HDMI cape ? Well, not all the pins of the PRUs are routed to the boards header pins. The max number of PRU pins in any case you can get is about 28 out of 64 pins, and most of the output pins happen to be routed to P8 header and associated to PRU1. But then, by default HDMI cape is loaded, which actually uses these pins, making it unstable to be used for PRUs. This pic of the [BeagleScope/docs/BeagleboneBlackP8HeaderTable.pdf](https://github.com/ZeekHuge/BeagleScope/blob/port_to_4.4.12-ti-r31%2B/docs/BeagleboneBlackP8HeaderTable.pdf) shows the pin numbers that we get after we disable the HDMI cape:
![P8 pins : muxed to hdmi by default](/images/hdmi_pins.png)
 So disabling it is the best option. To disable the cape, you need to edit your '/boot/uEnv.txt' file and uncomment 

```

dtb=am335x-boneblack-emmc-overlay.dtb

```

the first few lines of your '/boot/uEnv.txt' would then look something like this :

```

01 #Docs: http://elinux.org/Beagleboard:U-boot_partitioning_layout_2.0
02 
03 uname_r=4.4.12-ti-r31
04 ##uuid=
05 #dtb=
06 
07 ##BeagleBone Black/Green dtbs for v4.1.x (BeagleBone White just works..)
08 
09 ##BeagleBone Black: HDMI (Audio/Video) disabled:
10 dtb=am335x-boneblack-emmc-overlay.dtb
11 ##BeagleBone Black: eMMC disabled:
12 #dtb=am335x-boneblack-hdmi-overlay.dtb

```



---------------------------------------------------


##### <u>Available pins</u>{#pins}

* So after disabling the HDMI cape, we have a few pins to use for PRU examples on P8 header. At this point you might want to note the pins that we can use the. You can use this doc at [BeagleScope/docs/BeagleboneBlackP8HeaderTable.pdf](https://github.com/ZeekHuge/BeagleScope/blob/port_to_4.4.12-ti-r31%2B/docs/BeagleboneBlackP8HeaderTable.pdf):
![P8 pins : Associated to PRU1](/images/pru_pins_p8.png)


---------------------------------------------------


##### <u>LEDs on P8_45</u>{#leds}

* ***Read this carefully****. The blinky we are aiming to get will be using an external LED. ***NOW, THIS EXTERNAL LED SHOULD NOT USE CURRENT MORE THAN ~8mA, AND FOR THIS, AT 3.3V, ***THE RESISTOR TO BE USED SHOULD BE GREATER THAN OR EQUAL TO 470 ohms***. If you would want to the get more current out of it, checkout [this link](http://www.thebrokendesk.com/blog/blinking-an-led-with-the-beaglebone-black/). Connect this LED you have now, using a >=470 ohm resistor, to the P8_45 pin on the beaglebone black board.


---------------------------------------------------


##### <u>Setting up the PRU code generation tools</u>{#pcgt}
1. The PRUs are not like the other standard processors. PRUs are based on TI's proprietor architecture, and therefore we need a compiler other than GCC to compile code for PRUs. To download the code generation tools on your BBB(recommended) :

```

$ wget -c http://software-dl.ti.com/codegen/esd/cgt_public_sw/PRU/2.1.2/ti_cgt_pru_2.1.2_armlinuxa8hf_busybox_installer.sh
$ chmod +x ti_cgt_pru_2.1.2_armlinuxa8hf_busybox_installer.sh
$ ./ti_cgt_pru_2.1.2_armlinuxa8hf_busybox_installer.sh

```

To download it on you linux host system

```

$ wget -c http://software-dl.ti.com/codegen/esd/cgt_public_sw/PRU/2.1.2/ti_cgt_pru_2.1.2_linux_installer_x86.bin
$ chmod +x ti_cgt_pru_2.1.2_linux_installer_x86.bin
$ ./ti_cgt_pru_2.1.2_armlinuxa8hf_busybox_installer.sh

```


* To setup the environment, we need to create some symbolic links and export some environment variables. The symbolic links will help us to keep things at one place, and that is, inside the /usr/share/cgt-pru/. The symbolic links target to the
	+ clpru - The PRU c compiler
	+ lnkpru - The PRU linker

```

$ ln -s /usr/bin/clpru /usr/share/ti/cgt-pru/bin/clpru
$ ln -s /usr/bin/lnkpru /usr/share/ti/cgt-pru/bin/lnkpru

```


* We need the environment variable 'PRU_CGT' to point to the '/usr/share/ti/cgt-pru/' directory. This is pretty straight forward, just:

```

$ export PRU_CGT=/usr/share/ti/cgt-pru

```


* If you want this to be done automatically when you start a terminal on bbb, just add the above line to '~/.bash.rc'. Once all this is done, you can test your setup:

```

$ $PRU_CGT/bin/clpru

```

And a list of help options would appear.


----------------------------------------------------


##### <u>Get blinky</u>{#blin}
1. To get to the example we are going to use, you will have to get into the examples :
$ cd BeagleScope/examples/firmware_exmples/pru_blinky/

* Now that you are at the example, just:

```

$ ./deploy.sh

```

*and WHOLA ! You have the led blinking at P8_45.*


------------------------------------------------------


### <u>Into the code</u>{#code}
* For this post, we will dive into the PRU_gpioToggle/PRU_gpioToggle.c, PRU_gpioToggle/AM335x_PRU.cmd file and the deploy.sh script. We will get into the Makefile and the resource table in future post.


------------------------------------------------------


##### <u>The C code : PRU_gpioToggle.c</u>{#ccode}
* So here is the [code](https://github.com/ZeekHuge/BeagleScope/blob/port_to_4.4.12-ti-r31%2B/examples/firmware_exmples/pru_blinky/PRU_gpioToggle/PRU_gpioToggle.c) and its pretty straight forward .But there are two things I would like to discuss here :

	+ The __R31 and __R30 variables
	The two lines in the code :

```

	volatile register uint32_t __R30;
	volatile register uint32_t __R31;
	
```

	declares the global register variables __R30 and __R31.  One may think that any of the PRUs register could be accessed by using a variable of 'register' type, but that is not true with C/C++. The special thing about this is, the clpru (compiler we are using) can only have __R30 and __R31 as the variable of register type. The compiler would not allow the any variable other than __R31 and __R30 to be of the 'register' type, and the compiler do not allows to access any of the R29-R0 registers of the PRU. You may declare various variables and the PRU would manage internally, juggling all various resources (including registers), but no direct access is allowed.

	+ The __delay_cycles() function
	The __delay_cycles() function, as the name suggests, causes a delay of specified number of cycles. __delay_cycles() is an intrinsic compiler function. The term 'intrinsic' means that the definition of the function is not a fixed one. The definition is handled by the compiler. This is probably because in the assembly implementation of the loop, it takes one cycle to subtract 1 from counter register and then another cycle to compare the register. This limits the delay that can be produced by one implementation, as the next counter value will be
	
```

	counter = counter - 2
	
```

	A single implementation of delay function can work either for odd number of cycles, or an even umber of cycles, but not for both.
	The exact declaration of the function is as:
	
```

	void __delay_cycles (const unsigned int cycles);
	
```



-----------------------------------------------------


##### <u>The linker file : PRU_gpioToggle/AM335x_PRU.cmd</u>{#cmd}
1. PRUs are pretty simple processing cores, but the PRUSS system is highly integrated and provides the PRU a rich set of peripherals. All these peripherals inside the PRUSS are at different address locations and they need to be configured by the linux kernel at the time of firmware loading onto the PRUs. The [AM335x_PRU.cmd file](https://github.com/ZeekHuge/BeagleScope/blob/port_to_4.4.12-ti-r31%2B/examples/firmware_exmples/pru_blinky/PRU_gpioToggle/AM335x_PRU.cmd) provides a mapping to the linker, from different sections of code, to different memory locations inside the PRUSS.

* There are 2 sections inside the AM335x_PRU.cmd file :
	+ The 'MEMORY' section
	This section gives a kind of alias name to different regions of memory inside the PRUs. If you look at the code and this snippet from the PRU reference manual, you see that the mappings are indeed associated to the exact memory region of the peripherals.
<?prettify?>

```

MEMORY
{
      PAGE 0:
        PRU_IMEM                : org = 0x00000000 len = 0x00002000  /\* 8kB PRU0 Instruction RAM \*/
      PAGE 1:
        /\* RAM \*/
        PRU_DMEM_0_1    : org = 0x00000000 len = 0x00002000 CREGISTER=24 /\* 8kB PRU Data RAM 0_1 \*/
        PRU_DMEM_1_0    : org = 0x00002000 len = 0x00002000     CREGISTER=25 /\* 8kB PRU Data RAM 1_0 \*/
          PAGE 2:
        PRU_SHAREDMEM   : org = 0x00010000 len = 0x00003000 CREGISTER=28 /\* 12kB Shared RAM \*/
        DDR                         : org = 0x80000000 len = 0x00000100 CREGISTER=31
        L3OCMC                  : org = 0x40000000 len = 0x00010000     CREGISTER=30
        /\* Peripherals \*/
        PRU_CFG                 : org = 0x00026000 len = 0x00000044     CREGISTER=4
        PRU_ECAP                : org = 0x00030000 len = 0x00000060     CREGISTER=3
        PRU_IEP                 : org = 0x0002E000 len = 0x0000031C     CREGISTER=26
        PRU_INTC                : org = 0x00020000 len = 0x00001504     CREGISTER=0
        PRU_UART                : org = 0x00028000 len = 0x00000038     CREGISTER=7
        DCAN0                   : org = 0x481CC000 len = 0x000001E8     CREGISTER=14
        DCAN1                   : org = 0x481D0000 len = 0x000001E8     CREGISTER=15
        DMTIMER2                : org = 0x48040000 len = 0x0000005C     CREGISTER=1
        PWMSS0                  : org = 0x48300000 len = 0x000002C4     CREGISTER=18
        PWMSS1                  : org = 0x48302000 len = 0x000002C4     CREGISTER=19
        PWMSS2                  : org = 0x48304000 len = 0x000002C4     CREGISTER=20
        GEMAC                   : org = 0x4A100000 len = 0x0000128C     CREGISTER=9
        I2C1                    : org = 0x4802A000 len = 0x000000D8     CREGISTER=2
        I2C2                    : org = 0x4819C000 len = 0x000000D8     CREGISTER=17
        MBX0                    : org = 0x480C8000 len = 0x00000140     CREGISTER=22
        MCASP0_DMA              : org = 0x46000000 len = 0x00000100     CREGISTER=8
        MCSPI0                  : org = 0x48030000 len = 0x000001A4     CREGISTER=6
        MCSPI1                  : org = 0x481A0000 len = 0x000001A4     CREGISTER=16
        MMCHS0                  : org = 0x48060000 len = 0x00000300     CREGISTER=5
        SPINLOCK                : org = 0x480CA000 len = 0x00000880     CREGISTER=23
        TPCC                    : org = 0x49000000 len = 0x00001098     CREGISTER=29
        UART1                   : org = 0x48022000 len = 0x00000088     CREGISTER=11
        UART2                   : org = 0x48024000 len = 0x00000088     CREGISTER=12
        RSVD10                  : org = 0x48318000 len = 0x00000100     CREGISTER=10
        RSVD13                  : org = 0x48310000 len = 0x00000100     CREGISTER=13
        RSVD21                  : org = 0x00032400 len = 0x00000100     CREGISTER=21
        RSVD27                  : org = 0x00032000 len = 0x00000100     CREGISTER=27
}

```


![PRUSS Memory locations](/images/memory_mapping.png)


-----------------------


##### <u>The deploy script : deploy.sh</u>{#desh}
1. The deploy script, in this example does following things :
	+ 'make's the pru code.
	That is simple, the part of the script included below enters the PRU_gpioToggle and invokes the 'make' command to make the project.
	
```

	54 echo "-Building project"
	55 cd PRU_gpioToggle
 	56 make clean
 	57 make
	
```


	+ Copies the compiled pru firmware file (the file gen/*.out) to /lib/firmware/am335x-pru1-fw. When the PRUs are rebooted, the pru_rproc (remoteproc driver for PRUs) search for this file ans load it onto the PRU is it is present.
	The part of the script that does this is :

```

	59 echo "-Placing the firmware"
	60 cp gen/*.out /lib/firmware/am335x-pru$PRU_CORE-fw

```


	+ Configures the header pin.
	The script has two variables - 1) HEADER and 2) PIN_NUMBER. They together decide the boards header pin that is to be used and you can change them to get blinky on other pin (mind the comments above these variables in the script). The header pin is then configured and muxed to be a pru output pin. The script uses a very nice utility called 'config-pin' and an which, very intelligently uses a Universal cape to configure pins without using a device tree file. More about 'config-pin' can be found [here](/blog/a_handfull_of_commands_and_scripts_to_get_started_with_beagleboneblack/). The part of the script that configures the pin is :

```

62 echo "-Configuring pinmux"
63         config-pin -a $HEADER$PIN_NUMBER pruout
64         config-pin -q $HEADER$PIN_NUMBER

```


	+ Reboots the PRU cores. After the firmwares are /lib/firmware/am335x-pru1(0)-fw is present, rebooting the PRU cores automatically loads the PRU with these firmwares. The sysfs bindings at the '/sys/bus/platform/drivers/pru-rproc/' can be used to reboot PRUs (more on this below). The part of the script that reboots the PRU core, according to the variable PRU_CORE in the script

```

 66 echo "-Rebooting"
 67 if [ $PRU_CORE -eq 0 ]
 68 then
 69         echo "Rebooting pru-core 0"
 70         echo "4a334000.pru0" > /sys/bus/platform/drivers/pru-rproc/unbind 2>/dev/null
 71         echo "4a334000.pru0" > /sys/bus/platform/drivers/pru-rproc/bind
 72 else
 73         echo "Rebooting pru-core 1"
 74         echo "4a338000.pru1" > /sys/bus/platform/drivers/pru-rproc/unbind 2> /dev/null
 75         echo "4a338000.pru1" > /sys/bus/platform/drivers/pru-rproc/bind
 76 fi

```




------------------------------------------------


### <u>Whats next ?</u>{#nxt}
OK, so now you have a blinky ready and have got quite understanding of the PRUSS part. The next post will be related to [Tools and Commands](/blog/ptp_docs_commands_and_tools) that use while eperimenting with PRUs. They really make working with them easier. 
